#!/usr/bin/env node
/**
 * Usage: node scripts/test-detector.js /path/to/statement.pdf
 *
 * Extracts text from the PDF and runs bank detection for both account types.
 * Prints the detected source key + label, or "undetected".
 */

const path = require('path')
const pdfParse = require('pdf-parse')
const fs = require('fs')
const { detectBank } = require('../services/bankDetector')
const { SOURCE_META } = require('../config/sourceMeta')

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node scripts/test-detector.js /path/to/statement.pdf')
  process.exit(1)
}

const absPath = path.resolve(filePath)
if (!fs.existsSync(absPath)) {
  console.error(`File not found: ${absPath}`)
  process.exit(1)
}

;(async () => {
  console.log(`Reading: ${absPath}\n`)
  const buffer = fs.readFileSync(absPath)
  const pdfData = await pdfParse(buffer)
  const text = pdfData.text
  const sample = text.slice(0, 3000)

  console.log(`— Extracted ${text.length} chars total, testing first 3000 —\n`)
  console.log('Sample:\n' + sample.slice(0, 400).replace(/\n/g, ' ') + '\n...\n')

  for (const accountType of ['bank', 'credit_card']) {
    const source = detectBank(sample, accountType)
    if (source) {
      const meta = SOURCE_META[source]
      console.log(`✓ accountType="${accountType}" → ${source} (${meta?.label ?? '?'})`)
    } else {
      console.log(`✗ accountType="${accountType}" → undetected`)
    }
  }
})().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
