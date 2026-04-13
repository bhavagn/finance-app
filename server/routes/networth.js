const express = require('express')
const supabase = require('../services/supabase')

const router = express.Router()

// GET /api/networth/latest — must be before /:month to avoid routing conflict
router.get('/latest', async (req, res) => {
  const { data, error } = await supabase
    .from('net_worth_snapshots')
    .select('*')
    .order('month', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(error.message) // PGRST116 = no rows
  console.log('[networth] GET /latest —', data ? data.month : 'no data')
  res.json({ data: data || null })
})

// GET /api/networth — all snapshots ordered by month desc
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('net_worth_snapshots')
    .select('*')
    .order('month', { ascending: true })

  if (error) throw new Error(error.message)
  console.log(`[networth] GET / — ${data.length} snapshots`)
  res.json({ data })
})

// POST /api/networth/:month — upsert snapshot for a given month (YYYY-MM-DD)
router.post('/:month', async (req, res) => {
  const { month } = req.params
  const { mutual_funds, stocks, gold, chit_fund, cash, epfo, mf_source, stocks_source } = req.body

  if (!month || !/^\d{4}-\d{2}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month must be YYYY-MM-DD (first of month)' })
  }

  const payload = {
    month,
    mutual_funds: Number(mutual_funds) || 0,
    stocks: Number(stocks) || 0,
    gold: Number(gold) || 0,
    chit_fund: Number(chit_fund) || 0,
    cash: Number(cash) || 0,
    epfo: Number(epfo) || 0,
    mf_source: mf_source || 'manual',
    stocks_source: stocks_source || 'manual',
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('net_worth_snapshots')
    .upsert(payload, { onConflict: 'month' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  console.log(`[networth] UPSERT ${month} — total: ${data.total}`)
  res.json({ data })
})

module.exports = router
