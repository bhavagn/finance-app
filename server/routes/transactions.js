const express = require('express')
const supabase = require('../services/supabase')
const { categoriseBatch, resetTransactionCategories } = require('../services/categoriser')
const { getParent } = require('../lib/categories')

const router = express.Router()

const BACKFILL_BATCH_SIZE = 100

// GET /api/transactions
router.get('/', async (req, res) => {
  const { month, source, category, parent_category } = req.query
  const userId = req.user.id

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (source) query = query.eq('source', source)
  if (category) query = query.eq('category', category)
  if (parent_category) query = query.eq('parent_category', parent_category)

  if (month) {
    const start = `${month}-01`
    const [year, mon] = month.split('-').map(Number)
    const end = new Date(year, mon, 0).toISOString().split('T')[0]
    query = query.gte('date', start).lte('date', end)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  console.log(`[transactions] GET — returned ${data.length} rows for ${req.user.email}`)
  res.json({ data })
})

// POST /api/transactions/categorise-all
router.post('/categorise-all', async (req, res) => {
  const userId = req.user.id

  await resetTransactionCategories(userId)

  console.log('[transactions] categorise-all — fetching all transactions')

  const { data: transactions, error: fetchError } = await supabase
    .from('transactions')
    .select('id, description')
    .eq('user_id', userId)

  if (fetchError) throw new Error(fetchError.message)

  const total = transactions.length
  console.log(`[transactions] categorise-all — ${total} transactions to process`)

  if (total === 0) {
    return res.json({ data: { total: 0, categorised: 0, batches: 0 } })
  }

  let totalCategorised = 0
  let batchCount = 0

  for (let i = 0; i < transactions.length; i += BACKFILL_BATCH_SIZE) {
    const batch = transactions.slice(i, i + BACKFILL_BATCH_SIZE)
    batchCount++
    console.log(`[transactions] categorise-all — batch ${batchCount} (${batch.length} transactions)`)
    const result = await categoriseBatch(batch)
    totalCategorised += result.categorised
  }

  console.log(`[transactions] categorise-all — done. categorised: ${totalCategorised}/${total}`)
  res.json({ data: { total, categorised: totalCategorised, batches: batchCount } })
})

// PATCH /api/transactions/:id/category
router.patch('/:id/category', async (req, res) => {
  const { id } = req.params
  const { category } = req.body
  const userId = req.user.id

  if (!category) return res.status(400).json({ error: 'category is required' })

  const parent_category = getParent(category)

  const { error } = await supabase
    .from('transactions')
    .update({ category, parent_category })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  console.log(`[transactions] PATCH ${id} → ${category} (${parent_category})`)
  res.json({ data: { id, category, parent_category } })
})

module.exports = router
