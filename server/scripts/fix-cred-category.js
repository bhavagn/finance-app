/**
 * One-time migration: fix CRED transactions and category rule.
 * Run once from server/: node scripts/fix-cred-category.js
 * Delete this file after running.
 */
require('dotenv').config()
const supabase = require('../services/supabase')

async function run() {
  // 1. Delete any existing Cred-related rules
  const { data: deleted, error: delErr } = await supabase
    .from('category_rules')
    .delete()
    .ilike('keyword', '%cred%')
    .select('keyword, category')

  if (delErr) { console.error('Failed to delete old rules:', delErr.message); process.exit(1) }
  console.log('Deleted rules:', deleted)

  // 2. Insert new rule
  const { error: insErr } = await supabase
    .from('category_rules')
    .insert({ keyword: 'cred', category: 'Credit Card Payment' })

  if (insErr) { console.error('Failed to insert new rule:', insErr.message); process.exit(1) }
  console.log('Inserted rule: cred → Credit Card Payment')

  // 3. Update all transactions where description contains "cred" (case-insensitive)
  const { data: updated, error: txErr } = await supabase
    .from('transactions')
    .update({ category: 'Credit Card Payment' })
    .ilike('description', '%cred%')
    .select('id, description')

  if (txErr) { console.error('Failed to update transactions:', txErr.message); process.exit(1) }
  console.log(`Updated ${updated.length} transactions to Credit Card Payment`)
  updated.forEach((t) => console.log(' ', t.id, t.description))
}

run()
