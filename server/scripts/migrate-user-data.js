/**
 * Assigns all existing (user_id = NULL) rows to a specific user.
 *
 * Usage: node scripts/migrate-user-data.js your@email.com
 *
 * Run AFTER:
 *   - user_id columns have been added (Step 2 SQL)
 *   - BEFORE enabling RLS (Step 4 SQL)
 *   - The user must have already signed in at least once via Google Auth
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/migrate-user-data.js your@email.com')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

;(async () => {
  // 1. Look up user by email via admin API
  console.log(`Looking up user: ${email}`)
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 100 })
  if (listErr) throw new Error(`Failed to list users: ${listErr.message}`)

  const user = users.find((u) => u.email === email)
  if (!user) {
    console.error(`No user found with email: ${email}`)
    if (users.length > 0) {
      console.error('Users in auth:', users.map((u) => u.email).join(', '))
      console.error('Make sure you have signed in with Google at least once before running this.')
    } else {
      console.error('No users exist yet — sign in with Google first.')
    }
    process.exit(1)
  }

  const userId = user.id
  console.log(`Found: ${email} → ${userId}\n`)

  // 2. Count nulls before updating
  const { count: uploadsCount } = await supabase.from('pdf_uploads').select('*', { count: 'exact', head: true }).is('user_id', null)
  const { count: txnsCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).is('user_id', null)
  let insightsCount = 0
  try {
    const { count } = await supabase.from('insights').select('*', { count: 'exact', head: true }).is('user_id', null)
    insightsCount = count ?? 0
  } catch (_) {}

  console.log(`Rows to migrate:`)
  console.log(`  pdf_uploads:  ${uploadsCount ?? 0}`)
  console.log(`  transactions: ${txnsCount ?? 0}`)
  console.log(`  insights:     ${insightsCount}\n`)

  if (!uploadsCount && !txnsCount && !insightsCount) {
    console.log('Nothing to migrate — all rows already have user_id set.')
    return
  }

  // 3. Update all null rows
  const { error: uploadsErr } = await supabase.from('pdf_uploads').update({ user_id: userId }).is('user_id', null)
  if (uploadsErr) throw new Error(`pdf_uploads update failed: ${uploadsErr.message}`)

  const { error: txnsErr } = await supabase.from('transactions').update({ user_id: userId }).is('user_id', null)
  if (txnsErr) throw new Error(`transactions update failed: ${txnsErr.message}`)

  try {
    const { error: insightsErr } = await supabase.from('insights').update({ user_id: userId }).is('user_id', null)
    if (insightsErr) console.warn(`insights update warning: ${insightsErr.message}`)
  } catch (_) {}

  console.log(`Migration complete:`)
  console.log(`  Updated ${uploadsCount ?? 0} uploads`)
  console.log(`  Updated ${txnsCount ?? 0} transactions`)
  console.log(`  Updated ${insightsCount} insights`)
  console.log(`\nAll rows now owned by ${email} (${userId})`)
  console.log(`You can now run Step 4 (enable RLS).`)
})().catch((err) => {
  console.error('\nMigration failed:', err.message)
  process.exit(1)
})
