const express = require('express')
const supabase = require('../services/supabase')
const { generateAndStoreInsights } = require('../services/insightsService')

const router = express.Router()

// GET /api/insights/:month
router.get('/:month', async (req, res) => {
  const { month } = req.params
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month must be YYYY-MM' })
  }

  const rows = await generateAndStoreInsights(month, req.user.id)

  const generatedAt = rows.length > 0
    ? rows.reduce((latest, r) => r.created_at > latest ? r.created_at : latest, rows[0].created_at)
    : null

  console.log(`[insights] GET ${month} — ${rows.length} insights for ${req.user.email}`)
  res.json({ data: { month, insights: rows, generatedAt } })
})

// POST /api/insights/:month/regenerate
router.post('/:month/regenerate', async (req, res) => {
  const { month } = req.params
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month must be YYYY-MM' })
  }

  const { error } = await supabase
    .from('insights')
    .delete()
    .eq('month', month)
    .eq('user_id', req.user.id)

  if (error) throw new Error(`Failed to delete existing insights: ${error.message}`)

  console.log(`[insights] regenerate ${month} — cleared cache, regenerating`)
  const rows = await generateAndStoreInsights(month, req.user.id)

  const generatedAt = rows.length > 0
    ? rows.reduce((latest, r) => r.created_at > latest ? r.created_at : latest, rows[0].created_at)
    : null

  console.log(`[insights] regenerate ${month} — done, ${rows.length} insights`)
  res.json({ data: { month, insights: rows, generatedAt } })
})

module.exports = router
