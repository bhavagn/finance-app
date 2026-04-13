const express = require('express')
const multer = require('multer')
const pdfParse = require('pdf-parse')
const supabase = require('../services/supabase')
const { uploadPdf } = require('../services/storage')
const { parseBankStatement } = require('../services/claudeParser')
const { categoriseTransactions } = require('../services/categoriser')
const { detectBank } = require('../services/bankDetector')
const { SOURCE_META, getSourcesForType } = require('../config/sourceMeta')

const router = express.Router()

const ACCOUNT_TYPES = ['bank', 'credit_card']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are accepted'))
    }
  },
})

router.post('/', upload.single('file'), async (req, res) => {
  const { accountType, source: manualSource } = req.body

  if (!accountType || !ACCOUNT_TYPES.includes(accountType)) {
    return res.status(400).json({ error: `accountType must be one of: ${ACCOUNT_TYPES.join(', ')}` })
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded' })
  }

  // If manual source provided on retry, validate it
  if (manualSource && !SOURCE_META[manualSource]) {
    return res.status(400).json({ error: `Unknown source: ${manualSource}` })
  }

  const buffer = req.file.buffer
  const fileName = req.file.originalname
  const fileSize = req.file.size

  const userId = req.user.id
  console.log(`[parsePdf] Received upload — accountType: ${accountType}, file: ${fileName}, size: ${fileSize}, user: ${req.user.email}`)

  // Step 1: Extract text from PDF first (needed for detection)
  console.log('[parsePdf] Extracting text from PDF')
  let text
  try {
    const pdfData = await pdfParse(buffer)
    text = pdfData.text
  } catch (e) {
    return res.status(422).json({ error: 'Failed to extract text from PDF. Ensure it is not password-protected.' })
  }

  if (!text || text.trim().length < 50) {
    return res.status(422).json({ error: 'PDF appears to be empty or unreadable — try a text-based PDF' })
  }
  console.log('[parsePdf] Extracted', text.length, 'chars from PDF')

  // Step 2: Detect bank (or use manual source on retry)
  let source = manualSource ?? null
  if (!source) {
    source = detectBank(text.slice(0, 3000), accountType)
    if (!source) {
      console.log(`[parsePdf] Bank undetected for accountType: ${accountType}`)
      const availableSources = getSourcesForType(accountType)
        .filter(({ value }) => !value.includes('_credit') && !['icici_amazon_credit','icici_mmt_credit','hdfc_millennia_credit','bob_scapia_credit'].includes(value))
      return res.status(422).json({
        error: 'bank_undetected',
        message: 'Could not identify your bank from this PDF. Please select manually.',
        accountType,
        availableSources,
      })
    }
    console.log(`[parsePdf] Detected source: ${source}`)
  } else {
    console.log(`[parsePdf] Using manual source: ${source}`)
  }

  // Step 3: Upload PDF to Supabase Storage
  const storagePath = await uploadPdf(buffer, source, fileName)

  // Step 4: Create pdf_uploads record
  const { data: uploadRecord, error: insertError } = await supabase
    .from('pdf_uploads')
    .insert({
      user_id: userId,
      file_name: fileName,
      file_size: fileSize,
      storage_path: storagePath,
      source,
      status: 'processing',
    })
    .select()
    .single()

  if (insertError) {
    console.error('[parsePdf] Failed to create pdf_uploads record:', insertError.message)
    throw new Error('Failed to create upload record')
  }

  const uploadId = uploadRecord.id
  console.log('[parsePdf] Created pdf_uploads record:', uploadId)

  try {
    // Step 5: Call Claude to parse the statement
    const parsed = await parseBankStatement(text)

    // Step 6a: Duplicate detection — check for overlapping statement period
    const periodStart = parsed.statement_period?.start
    const periodEnd = parsed.statement_period?.end

    if (periodStart && periodEnd) {
      const { data: overlapping, error: dupCheckError } = await supabase
        .from('pdf_uploads')
        .select('id, statement_period_start, statement_period_end')
        .eq('user_id', userId)
        .eq('source', source)
        .eq('status', 'parsed')
        .lte('statement_period_start', periodEnd)
        .gte('statement_period_end', periodStart)
        .neq('id', uploadId)

      if (dupCheckError) {
        console.error('[parsePdf] Duplicate check query failed:', dupCheckError.message)
      } else if (overlapping && overlapping.length > 0) {
        const exactMatch = overlapping.find(
          (o) => o.statement_period_start === periodStart && o.statement_period_end === periodEnd
        )
        if (exactMatch) {
          console.log(`[parsePdf] Exact duplicate detected — conflicts with upload ${exactMatch.id}`)
          throw new Error('This statement has already been uploaded. Delete the existing upload first if you want to re-upload.')
        }
        console.log(`[parsePdf] Partial period overlap with ${overlapping.length} upload(s) — will dedup at transaction level`)
      }
    }

    // Step 6b: Update pdf_uploads with statement period
    const { error: updateError } = await supabase
      .from('pdf_uploads')
      .update({
        status: 'parsed',
        statement_period_start: periodStart || null,
        statement_period_end: periodEnd || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', uploadId)

    if (updateError) {
      console.error('[parsePdf] Failed to update pdf_uploads status:', updateError.message)
    }

    // Step 7: Insert transactions
    if (parsed.transactions.length > 0) {
      const rows = parsed.transactions.map((t) => ({
        user_id: userId,
        upload_id: uploadId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        balance: t.balance ?? null,
        reference_number: t.reference_number ?? null,
        source,
      }))

      console.log('[parsePdf] Inserting', rows.length, 'transactions')

      const { error: txError } = await supabase.from('transactions').insert(rows)

      if (txError) {
        console.error('[parsePdf] Failed to insert transactions:', txError.message)
        throw new Error('Failed to save transactions')
      }
    }

    // Step 8: Transaction-level dedup
    let duplicatesRemoved = 0
    if (parsed.transactions.length > 0) {
      duplicatesRemoved = await deduplicateTransactions(uploadId, source, userId)
    }

    // Step 9: Auto-categorise (non-fatal)
    try {
      await categoriseTransactions(uploadId)
    } catch (catErr) {
      console.error('[parsePdf] Categorisation failed (non-fatal):', catErr.message)
    }

    console.log(`[parsePdf] Done — upload_id: ${uploadId}, source: ${source}, duplicates_removed: ${duplicatesRemoved}`)

    return res.json({
      data: {
        upload_id: uploadId,
        source,
        statement_period: parsed.statement_period,
        transaction_count: parsed.transactions.length,
        duplicates_removed: duplicatesRemoved,
        transactions: parsed.transactions,
      },
    })
  } catch (err) {
    await supabase
      .from('pdf_uploads')
      .update({ status: 'failed', error_message: err.message, updated_at: new Date().toISOString() })
      .eq('id', uploadId)
    throw err
  }
})

/**
 * Find transactions from this upload that already exist in older uploads (same source).
 * Delete the older copies. Mark older uploads as 'superseded' if all their transactions are gone.
 */
async function deduplicateTransactions(uploadId, source, userId) {
  const { data: newTxs, error: newErr } = await supabase
    .from('transactions')
    .select('id, date, amount, type, description')
    .eq('upload_id', uploadId)
    .eq('user_id', userId)

  if (newErr || !newTxs?.length) return 0

  const newSigs = new Set(
    newTxs.map((tx) => `${tx.date}|${tx.amount}|${tx.type}|${tx.description.toLowerCase()}`)
  )

  const { data: existingTxs, error: existErr } = await supabase
    .from('transactions')
    .select('id, date, amount, type, description, upload_id')
    .eq('user_id', userId)
    .eq('source', source)
    .neq('upload_id', uploadId)

  if (existErr || !existingTxs?.length) return 0

  const toDelete = []
  const affectedUploadIds = new Set()
  for (const tx of existingTxs) {
    const sig = `${tx.date}|${tx.amount}|${tx.type}|${tx.description.toLowerCase()}`
    if (newSigs.has(sig)) {
      toDelete.push(tx.id)
      affectedUploadIds.add(tx.upload_id)
    }
  }

  if (toDelete.length === 0) return 0

  const { error: delErr } = await supabase.from('transactions').delete().in('id', toDelete)
  if (delErr) {
    console.error('[parsePdf] Failed to delete duplicate transactions:', delErr.message)
    return 0
  }
  console.log(`[parsePdf] Removed ${toDelete.length} duplicate transactions from older uploads`)

  for (const oldUploadId of affectedUploadIds) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('upload_id', oldUploadId)

    if (count === 0) {
      await supabase
        .from('pdf_uploads')
        .update({ status: 'superseded', updated_at: new Date().toISOString() })
        .eq('id', oldUploadId)
      console.log(`[parsePdf] Marked upload ${oldUploadId} as superseded`)
    }
  }

  return toDelete.length
}

module.exports = router
