const express = require('express')
const supabase = require('../services/supabase')
const { getParent } = require('../lib/categories')

const router = express.Router()

// Categories to exclude from spend totals (pass-through and income)
const EXCLUDE_CATEGORIES = ['Salary', 'Credit Card Payment', 'Transfers', 'Fees & Charges']
const INVESTMENT_CATEGORIES = ['Gold', 'Mutual Funds', 'Stocks', 'Chit Fund']

// GET /api/dashboard/monthly?month=YYYY-MM&source=
router.get('/monthly', async (req, res) => {
  const { month, source } = req.query
  if (!month) return res.status(400).json({ error: 'month is required (YYYY-MM)' })

  const [year, mon] = month.split('-').map(Number)
  const start = `${month}-01`
  const end = new Date(year, mon, 0).toISOString().split('T')[0]

  let query = supabase
    .from('transactions')
    .select('category, parent_category, amount')
    .gte('date', start)
    .lte('date', end)
    .eq('type', 'debit')

  if (source) query = query.eq('source', source)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const totals = {}
  for (const tx of data) {
    const cat = tx.category || 'Other'
    if (EXCLUDE_CATEGORIES.includes(cat)) continue
    totals[cat] = (totals[cat] || 0) + Math.abs(tx.amount)
  }

  const categories = Object.entries(totals)
    .map(([category, total]) => ({
      category,
      parent_category: tx_parent(data, category),
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total)

  const totalSpent = categories.reduce((sum, c) => sum + c.total, 0)
  const topCategory = categories[0] || null
  const txCount = data.filter((tx) => !EXCLUDE_CATEGORIES.includes(tx.category || 'Other')).length

  console.log(`[dashboard] monthly ${month} — ${categories.length} categories, ₹${totalSpent.toFixed(0)} total`)
  res.json({ data: { month, totalSpent: Math.round(totalSpent * 100) / 100, topCategory, txCount, categories } })
})

function tx_parent(data, category) {
  const tx = data.find((t) => t.category === category)
  return tx?.parent_category || getParent(category)
}

// GET /api/dashboard/trends?source=
router.get('/trends', async (req, res) => {
  const { source } = req.query

  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    months.push(`${y}-${m}`)
  }

  const start = `${months[0]}-01`
  const lastMonth = months[months.length - 1]
  const [ly, lm] = lastMonth.split('-').map(Number)
  const end = new Date(ly, lm, 0).toISOString().split('T')[0]

  let query = supabase
    .from('transactions')
    .select('date, amount, category')
    .gte('date', start)
    .lte('date', end)
    .eq('type', 'debit')

  if (source) query = query.eq('source', source)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const totals = {}
  for (const month of months) totals[month] = 0

  for (const tx of data) {
    const cat = tx.category || 'Other'
    if (EXCLUDE_CATEGORIES.includes(cat)) continue
    const month = tx.date.slice(0, 7)
    if (totals[month] !== undefined) totals[month] += Math.abs(tx.amount)
  }

  const trends = months.map((month) => ({
    month,
    total: Math.round(totals[month] * 100) / 100,
  }))

  res.json({ data: { trends } })
})

// GET /api/dashboard/by-parent?month=YYYY-MM
router.get('/by-parent', async (req, res) => {
  const { month } = req.query
  if (!month) return res.status(400).json({ error: 'month is required (YYYY-MM)' })

  const [year, mon] = month.split('-').map(Number)
  const start = `${month}-01`
  const end = new Date(year, mon, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('transactions')
    .select('category, parent_category, amount')
    .gte('date', start)
    .lte('date', end)
    .eq('type', 'debit')

  if (error) throw new Error(error.message)

  const totals = {}
  for (const tx of data) {
    const cat = tx.category || 'Other'
    const parent = tx.parent_category || getParent(cat)
    if (parent === 'Pass-through' || parent === 'Income') continue
    totals[parent] = (totals[parent] || 0) + Math.abs(tx.amount)
  }

  const parents = Object.entries(totals)
    .map(([parent, total]) => ({ parent, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)

  res.json({ data: { month, parents } })
})

// GET /api/dashboard/overview?month=YYYY-MM
router.get('/overview', async (req, res) => {
  const { month } = req.query
  if (!month) return res.status(400).json({ error: 'month is required (YYYY-MM)' })

  const [year, mon] = month.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const monthStart = `${month}-01`
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`

  const trendMonths = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, mon - 1 - i, 1)
    trendMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const windowStart = `${trendMonths[0]}-01`
  const [wly, wlm] = trendMonths[trendMonths.length - 1].split('-').map(Number)
  const windowEnd = new Date(wly, wlm, 0).toISOString().split('T')[0]
  const prevMonth = trendMonths[4]

  const userId = req.user.id
  const [debitRes, creditRes, uploadsRes] = await Promise.all([
    supabase.from('transactions').select('date, amount, category, parent_category').eq('user_id', userId).eq('type', 'debit').gte('date', windowStart).lte('date', windowEnd),
    supabase.from('transactions').select('date, amount, category, description').eq('user_id', userId).eq('type', 'credit').gte('date', windowStart).lte('date', windowEnd),
    supabase.from('pdf_uploads').select('created_at').eq('user_id', userId).lte('statement_period_start', monthEnd).gte('statement_period_end', monthStart).order('created_at', { ascending: false }).limit(1),
  ])

  if (debitRes.error) throw new Error(debitRes.error.message)
  if (creditRes.error) throw new Error(creditRes.error.message)

  // Aggregate debits by month + category (excluding pass-through + income)
  const debitByMonth = {}
  const investByMonth = {}
  const catByMonth = {}
  for (const m of trendMonths) { debitByMonth[m] = 0; investByMonth[m] = 0; catByMonth[m] = {} }

  for (const tx of debitRes.data) {
    const cat = tx.category || 'Other'
    if (EXCLUDE_CATEGORIES.includes(cat)) continue
    const m = tx.date.slice(0, 7)
    if (debitByMonth[m] === undefined) continue
    const amt = Math.abs(tx.amount)
    debitByMonth[m] += amt
    catByMonth[m][cat] = (catByMonth[m][cat] || 0) + amt
    if (INVESTMENT_CATEGORIES.includes(cat)) investByMonth[m] += amt
  }

  // Aggregate credits by month
  const creditByMonth = {}
  for (const m of trendMonths) creditByMonth[m] = 0
  let salaryDate = null
  let incomeTxCount = 0

  for (const tx of creditRes.data) {
    const m = tx.date.slice(0, 7)
    if (creditByMonth[m] !== undefined) creditByMonth[m] += Math.abs(tx.amount)
    if (m === month) {
      incomeTxCount++
      if (!salaryDate && (tx.category === 'Salary' || tx.description?.toLowerCase().includes('salary'))) {
        salaryDate = new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      }
    }
  }

  // Current month metrics
  const totalSpent   = Math.round(debitByMonth[month] * 100) / 100
  const totalInvested = Math.round(investByMonth[month] * 100) / 100
  const totalExpenses = Math.round((totalSpent - totalInvested) * 100) / 100
  const totalIncome  = Math.round(creditByMonth[month] * 100) / 100
  const savedAmount  = Math.round((totalIncome - totalSpent) * 100) / 100
  const savingsRate  = totalIncome > 0 ? Math.round((savedAmount / totalIncome) * 100) : 0
  const avgPerDay    = daysInMonth > 0 ? Math.round(totalSpent / daysInMonth) : 0

  const currentCats = catByMonth[month] || {}
  const txCount = debitRes.data.filter(tx => tx.date.startsWith(month) && !EXCLUDE_CATEGORIES.includes(tx.category || 'Other')).length
  const uncategorisedCount = debitRes.data.filter(tx => tx.date.startsWith(month) && (tx.category === 'Other' || !tx.category)).length

  const prevMonthSpent = Math.round(debitByMonth[prevMonth] * 100) / 100
  const spentDelta = Math.round((totalExpenses - (prevMonthSpent - (investByMonth[prevMonth] || 0))) * 100) / 100
  const prevMonthLabel = new Date(Number(prevMonth.split('-')[0]), Number(prevMonth.split('-')[1]) - 1, 1)
    .toLocaleString('en-IN', { month: 'short' })

  const catTotals6 = {}
  for (const m of trendMonths) {
    for (const [cat, total] of Object.entries(catByMonth[m] || {})) {
      catTotals6[cat] = (catTotals6[cat] || 0) + total
    }
  }
  const categories = Object.entries(currentCats)
    .map(([category, total]) => ({
      category,
      total: Math.round(total),
      sixMonthAvg: Math.round((catTotals6[category] || 0) / 6),
      delta: Math.round(total - (catTotals6[category] || 0) / 6),
    }))
    .sort((a, b) => b.total - a.total)

  const MONTH_INITIALS = ['J','F','M','A','M','J','J','A','S','O','N','D']
  const trends = trendMonths.map((m) => {
    const income = creditByMonth[m] || 0
    const spent = debitByMonth[m] || 0
    const rate = income > 0 ? Math.round(((income - spent) / income) * 100) : null
    return {
      month: m,
      total: Math.round(spent * 100) / 100,
      label: MONTH_INITIALS[parseInt(m.split('-')[1]) - 1],
      isCurrent: m === month,
      savingsRate: rate,
    }
  })
  const ratesWithData = trends.filter(t => t.savingsRate !== null && !t.isCurrent)
  const avgSavingsRate = ratesWithData.length > 0
    ? Math.round(ratesWithData.reduce((s, t) => s + t.savingsRate, 0) / ratesWithData.length)
    : null

  const parsedDate = uploadsRes.data?.[0]?.created_at
    ? new Date(uploadsRes.data[0].created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null
  const monthLabel = new Date(year, mon - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  console.log(`[dashboard] overview ${month} — expenses ₹${totalExpenses}, invested ₹${totalInvested}, income ₹${totalIncome}`)
  res.json({ data: {
    month, monthLabel, parsedDate, txCount, uncategorisedCount, daysInMonth,
    totalSpent, totalExpenses, totalInvested, totalIncome, incomeTxCount, salaryDate,
    savedAmount, savingsRate, avgPerDay,
    prevMonthSpent, prevMonthLabel, spentDelta,
    categories, trends, avgSavingsRate,
  }})
})

module.exports = router
