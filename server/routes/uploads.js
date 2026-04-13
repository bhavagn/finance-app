const express = require('express')
const supabase = require('../services/supabase')

const router = express.Router()

// GET /api/uploads
router.get('/', async (req, res) => {
  const userId = req.user.id

  const { data: uploads, error: uploadsErr } = await supabase
    .from('pdf_uploads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (uploadsErr) throw new Error(uploadsErr.message)

  const { data: txRows, error: txErr } = await supabase
    .from('transactions')
    .select('upload_id')
    .eq('user_id', userId)

  if (txErr) throw new Error(txErr.message)

  const countMap = {}
  for (const row of txRows || []) {
    countMap[row.upload_id] = (countMap[row.upload_id] || 0) + 1
  }

  const result = uploads.map((u) => ({ ...u, transaction_count: countMap[u.id] || 0 }))

  console.log(`[uploads] GET — returned ${result.length} uploads for ${req.user.email}`)
  res.json({ data: result })
})

// DELETE /api/uploads/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  const { data: upload, error: fetchErr } = await supabase
    .from('pdf_uploads')
    .select('id, file_name, source')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (fetchErr || !upload) return res.status(404).json({ error: 'Upload not found' })

  const { error: delErr } = await supabase
    .from('pdf_uploads')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (delErr) throw new Error(delErr.message)

  console.log(`[uploads] DELETE ${id} — ${upload.file_name} (${req.user.email})`)
  res.json({ data: { id } })
})

module.exports = router
