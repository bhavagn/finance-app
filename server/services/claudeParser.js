const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Output token budget: claude-haiku-4-5 max is 8192 output tokens.
// ~150 JSON chars per transaction ≈ ~37 tokens each → 8192 / 37 ≈ 220 transactions max per call.
// A safe input chunk of ~40,000 chars typically contains ~100-150 transactions (~5,000 output tokens),
// leaving comfortable headroom before the 8192 limit.
const CHUNK_THRESHOLD = 20000   // split if text exceeds this
const CHUNK_SIZE = 20000        // max characters per chunk

const BANK_STATEMENT_SYSTEM_PROMPT = `You are a precise financial data extractor for Indian bank and credit card statements.

You will receive raw text from one of these statements:
- Bank savings accounts: SBI, HDFC, Federal Bank
- Credit cards: Amazon Pay ICICI, ICICI MMT, HDFC Millennia, BOB Scapia

Detect the statement type from the content and return the correct source value.

Extract ALL transactions and return a single JSON object.
No explanation, no markdown, no code fences — raw JSON only.

Output format:
{
  "source": "sbi_savings | hdfc_savings | federal_savings | icici_amazon_credit | icici_mmt_credit | hdfc_millennia_credit | bob_scapia_credit",
  "statement_period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "cleaned merchant/narration text",
      "amount": 1234.56,
      "type": "debit | credit",
      "balance": 45678.90,
      "reference_number": "string or null"
    }
  ]
}

Rules:
1. amount is always positive. Use type for direction.
2. Bank accounts — debit: money out. credit: money in.
3. Credit cards — debit: purchases/charges. credit: payments, cashback, reversals.
4. description: strip account numbers, clean whitespace, preserve merchant name.
5. date must be YYYY-MM-DD. Handle all Indian date formats: DD/MM/YY, DD/MM/YYYY, DD MMM YYYY.
6. balance: closing balance after transaction. Use null for credit cards.
7. Ignore headers, summary rows, opening balance rows, page numbers.
8. Do not skip any transaction including fees, interest, and reversals.
9. If you cannot detect the bank/card from the content, return an error field explaining why.
10. Always complete the JSON. Never truncate. If you reach the end of the text, close all open brackets and return valid complete JSON.`

/**
 * Split text into chunks of at most CHUNK_SIZE characters.
 * Splits only at double-newline boundaries (\n\n) — paragraph/page breaks —
 * so individual transaction lines are never cut mid-way.
 * Falls back to single-newline boundaries if no double-newline split point exists.
 */
function splitIntoChunks(text) {
  const chunks = []
  const paragraphs = text.split('\n\n')
  let current = ''

  for (const para of paragraphs) {
    const separator = current.length === 0 ? '' : '\n\n'
    if (current.length + separator.length + para.length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current)
      current = para
    } else {
      current = current.length === 0 ? para : current + '\n\n' + para
    }
  }

  if (current.length > 0) chunks.push(current)
  return chunks
}

/**
 * Deduplicate transactions by date + description + amount.
 * Keeps the first occurrence when duplicates are found.
 */
function deduplicateTransactions(transactions) {
  const seen = new Set()
  return transactions.filter((t) => {
    const key = `${t.date}|${t.description}|${t.amount}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Call Claude once with a single text chunk and return the parsed object.
 */
async function callClaude(text, chunkIndex, totalChunks) {
  const label = totalChunks > 1 ? ` (chunk ${chunkIndex + 1}/${totalChunks})` : ''
  console.log(`[claudeParser] Sending to Claude API${label} — length: ${text.length} chars`)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system: BANK_STATEMENT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  })

  console.log(`[claudeParser] Received response${label} — stop_reason: ${message.stop_reason}`)

  if (message.stop_reason === 'max_tokens') {
    console.error(`[claudeParser] OUTPUT TRUNCATED${label} — Claude hit the max_tokens limit (8192). The JSON will be incomplete. Reduce chunk size or the statement is too large.`)
    throw new Error(`Claude response was truncated (max_tokens hit)${label} — try uploading a shorter date range`)
  }

  console.log('RAW CLAUDE RESPONSE:', message.content[0].text)

  let rawText = message.content[0].text

  // Strip markdown code fences if present
  rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  // If there's text before the first {, strip it
  const jsonStart = rawText.indexOf('{')
  const jsonEnd = rawText.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1) {
    rawText = rawText.substring(jsonStart, jsonEnd + 1)
  }

  let parsed
  try {
    parsed = JSON.parse(rawText)
  } catch {
    console.error(`[claudeParser] Failed to parse JSON${label}:`, rawText.slice(0, 200))
    throw new Error(`Claude returned invalid JSON${label}`)
  }

  if (parsed.error) {
    throw new Error(`Claude could not parse statement: ${parsed.error}`)
  }

  if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
    throw new Error(`Claude response missing transactions array${label}`)
  }

  console.log(`[claudeParser] Parsed ${parsed.transactions.length} transactions${label}, source: ${parsed.source}`)
  return parsed
}

async function parseBankStatement(text) {
  console.log('[claudeParser] Text length:', text.length, 'chars')

  if (text.length <= CHUNK_THRESHOLD) {
    return callClaude(text, 0, 1)
  }

  const chunks = splitIntoChunks(text)
  console.log(`[claudeParser] Text exceeds ${CHUNK_THRESHOLD} chars — splitting into ${chunks.length} chunks of up to ${CHUNK_SIZE} chars each`)

  // Call Claude sequentially to respect rate limits and preserve ordering
  const results = []
  for (let i = 0; i < chunks.length; i++) {
    results.push(await callClaude(chunks[i], i, chunks.length))
  }

  // Merge: source + statement_period from first chunk, transactions from all chunks
  const allTransactions = deduplicateTransactions(results.flatMap((r) => r.transactions))

  const merged = {
    source: results[0].source,
    statement_period: {
      start: results.map((r) => r.statement_period?.start).filter(Boolean).sort()[0] || null,
      end: results.map((r) => r.statement_period?.end).filter(Boolean).sort().reverse()[0] || null,
    },
    transactions: allTransactions,
  }

  console.log(`[claudeParser] Merged ${merged.transactions.length} transactions (${results.flatMap((r) => r.transactions).length - merged.transactions.length} duplicates removed) across ${chunks.length} chunks`)
  return merged
}

module.exports = { parseBankStatement }
