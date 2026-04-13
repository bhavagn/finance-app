/**
 * One-time cleanup: finds duplicate transactions in the DB, keeps the most
 * recently created one per group (same source + date + amount + type + description),
 * and deletes the rest.
 *
 * Usage (from server/): node scripts/dedup-transactions.js
 * Delete this file after running.
 */
require('dotenv').config()
const supabase = require('../services/supabase')

async function run() {
  console.log('Fetching all transactions…')
  const { data: allTxs, error } = await supabase
    .from('transactions')
    .select('id, source, date, amount, type, description, created_at')

  if (error) { console.error(error.message); process.exit(1) }
  console.log(`Fetched ${allTxs.length} transactions`)

  // Group by source + date + amount + type + lower(description)
  const groups = {}
  for (const tx of allTxs) {
    const sig = `${tx.source}|${tx.date}|${tx.amount}|${tx.type}|${tx.description.toLowerCase()}`
    if (!groups[sig]) groups[sig] = []
    groups[sig].push(tx)
  }

  // Collect IDs to delete — keep newest (latest created_at), remove rest
  const toDelete = []
  for (const txs of Object.values(groups)) {
    if (txs.length <= 1) continue
    txs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    toDelete.push(...txs.slice(1).map((t) => t.id))
  }

  if (toDelete.length === 0) {
    console.log('No duplicates found.')
    process.exit(0)
  }

  console.log(`Found ${toDelete.length} duplicate transactions to remove`)

  // Delete in batches of 100
  let deleted = 0
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100)
    const { error: delErr } = await supabase.from('transactions').delete().in('id', batch)
    if (delErr) { console.error('Delete error:', delErr.message); process.exit(1) }
    deleted += batch.length
    console.log(`Deleted ${deleted}/${toDelete.length}…`)
  }

  console.log(`Done. Removed ${toDelete.length} duplicate transactions.`)
  process.exit(0)
}

run()
