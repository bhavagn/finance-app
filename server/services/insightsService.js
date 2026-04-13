'use strict'
const Anthropic = require('@anthropic-ai/sdk')
const supabase = require('./supabase')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXCLUDE = new Set(['Salary', 'Credit Card Payment', 'Transfers', 'Fees & Charges'])
const SEV_ORDER = { warning: 0, positive: 1, info: 2 }

// ── helpers ───────────────────────────────────────────────────────────────────

const inr = (n) => '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN')
const pct = (n) => Math.round(Math.abs(n)) + '%'

function sortInsights(rows) {
  return [...rows].sort((a, b) => {
    const d = (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3)
    return d !== 0 ? d : new Date(a.created_at) - new Date(b.created_at)
  })
}

// ── data fetch ────────────────────────────────────────────────────────────────

async function fetchAllTransactions(userId) {
  const [dr, cr] = await Promise.all([
    supabase.from('transactions').select('date, description, amount, category').eq('user_id', userId).eq('type', 'debit'),
    supabase.from('transactions').select('date, amount, category').eq('user_id', userId).eq('type', 'credit'),
  ])
  if (dr.error) throw new Error(dr.error.message)
  if (cr.error) throw new Error(cr.error.message)
  return { debits: dr.data || [], credits: cr.data || [] }
}

// ── rule engine (synchronous) ─────────────────────────────────────────────────

function generateRuleInsights(month, { debits, credits }) {
  const insights = []

  const thisD  = debits.filter(t => t.date.slice(0, 7) === month)
  const priorD = debits.filter(t => t.date.slice(0, 7) !== month)
  const thisC  = credits.filter(t => t.date.slice(0, 7) === month)

  // Spend = debits excluding pass-through / income categories
  const spendThis  = thisD.filter(t => !EXCLUDE.has(t.category || 'Other'))
  const spendPrior = priorD.filter(t => !EXCLUDE.has(t.category || 'Other'))

  // ── Rules 1 & 2: category spike / drop ───────────────────────────────────

  // this month: { cat → total }
  const thisMonthByCat = {}
  for (const t of spendThis) {
    const c = t.category || 'Other'
    thisMonthByCat[c] = (thisMonthByCat[c] || 0) + Math.abs(t.amount)
  }

  // prior months: { cat → { month → total } }
  const priorByCat = {}
  for (const t of spendPrior) {
    const c = t.category || 'Other'
    const m = t.date.slice(0, 7)
    if (!priorByCat[c]) priorByCat[c] = {}
    priorByCat[c][m] = (priorByCat[c][m] || 0) + Math.abs(t.amount)
  }

  for (const [cat, thisAmt] of Object.entries(thisMonthByCat)) {
    const monthlyAmts = Object.values(priorByCat[cat] || {})
    if (monthlyAmts.length < 2) continue // need at least 2 months of history
    const avg  = monthlyAmts.reduce((s, v) => s + v, 0) / monthlyAmts.length
    const diff = thisAmt - avg
    const pctC = avg > 0 ? (diff / avg) * 100 : 0

    if (pctC > 40 && diff > 500) {
      insights.push({
        severity: 'warning', category: cat,
        title: `${cat} is ${inr(diff)} above your usual`,
        body:  `avg ${inr(avg)}/mo · this month ${inr(thisAmt)}`,
      })
    } else if (pctC < -40 && Math.abs(diff) > 500) {
      insights.push({
        severity: 'positive', category: cat,
        title: `Spent less on ${cat} than usual`,
        body:  `avg ${inr(avg)}/mo · this month ${inr(thisAmt)} · saved ${inr(Math.abs(diff))}`,
      })
    }
  }

  // ── Rule 3: new merchants (top 3 by amount) ───────────────────────────────

  const priorDescs = new Set(priorD.map(t => t.description.toLowerCase()))
  const newMap = {}
  for (const t of spendThis) {
    if (priorDescs.has(t.description.toLowerCase())) continue
    const key = t.description.toLowerCase()
    if (!newMap[key]) newMap[key] = { description: t.description, amount: 0 }
    newMap[key].amount += Math.abs(t.amount)
  }

  Object.values(newMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .forEach(m => insights.push({
      severity: 'info', category: null,
      title: `New: ${m.description}`,
      body:  `${inr(m.amount)} · first time this merchant appears`,
    }))

  // ── Rule 4: recurring subscriptions (active this month, 3+ months, ±10%) ─

  const merchantMonths = {} // { desc_key → { description, months: { month → total } } }
  for (const t of debits) {
    if (EXCLUDE.has(t.category || 'Other')) continue
    const key = t.description.toLowerCase()
    const m   = t.date.slice(0, 7)
    if (!merchantMonths[key]) merchantMonths[key] = { description: t.description, months: {} }
    merchantMonths[key].months[m] = (merchantMonths[key].months[m] || 0) + Math.abs(t.amount)
  }

  let recurringAdded = 0
  for (const { description, months } of Object.values(merchantMonths)) {
    if (recurringAdded >= 5) break
    const monthKeys = Object.keys(months)
    if (monthKeys.length < 3) continue
    if (!months[month]) continue // only report if active this month

    const amounts = Object.values(months)
    const mean    = amounts.reduce((s, v) => s + v, 0) / amounts.length
    if (mean < 50) continue
    const maxDev  = Math.max(...amounts.map(a => Math.abs(a - mean) / mean))
    if (maxDev > 0.1) continue

    insights.push({
      severity: 'info', category: null,
      title: `${description} is a recurring ${inr(mean)}/mo subscription`,
      body:  `seen for ${monthKeys.length} months`,
    })
    recurringAdded++
  }

  // ── Rule 5: largest transaction this month ────────────────────────────────

  if (spendThis.length > 0) {
    const largest = spendThis.reduce((mx, t) => Math.abs(t.amount) > Math.abs(mx.amount) ? t : mx)
    const dateStr = new Date(largest.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    insights.push({
      severity: 'info', category: largest.category || 'Other',
      title: `Biggest spend: ${largest.description}`,
      body:  `${inr(Math.abs(largest.amount))} on ${dateStr}`,
    })
  }

  // ── Rules 6 & 7: savings rate and MoM spend — need per-month aggregates ──

  const allMonths = new Set([...debits, ...credits].map(t => t.date.slice(0, 7)))
  const monthStats = {}
  for (const m of allMonths) {
    const mSpend  = debits
      .filter(t => t.date.slice(0, 7) === m && !EXCLUDE.has(t.category || 'Other'))
      .reduce((s, t) => s + Math.abs(t.amount), 0)
    const mIncome = credits
      .filter(t => t.date.slice(0, 7) === m)
      .reduce((s, t) => s + Math.abs(t.amount), 0)
    monthStats[m] = {
      spend:  mSpend,
      income: mIncome,
      rate:   mIncome > 0 ? ((mIncome - mSpend) / mIncome) * 100 : 0,
    }
  }

  // Rule 6: savings rate vs all-time average
  const priorStats = Object.entries(monthStats)
    .filter(([m]) => m !== month)
    .map(([, s]) => s)

  if (priorStats.length >= 2 && monthStats[month]) {
    const avgRate  = priorStats.reduce((s, m) => s + m.rate, 0) / priorStats.length
    const thisRate = monthStats[month].rate
    const diff     = thisRate - avgRate

    if (diff > 5) {
      insights.push({
        severity: 'positive', category: null,
        title: `Best savings rate in ${priorStats.length} months at ${Math.round(thisRate)}%`,
        body:  `all-time avg ${Math.round(avgRate)}%`,
      })
    } else if (diff < -5) {
      const avgSpend = priorStats.reduce((s, m) => s + m.spend, 0) / priorStats.length
      const extra    = monthStats[month].spend - avgSpend
      insights.push({
        severity: 'warning', category: null,
        title: `Savings rate of ${Math.round(thisRate)}% is below your usual ${Math.round(avgRate)}%`,
        body:  `spent ${inr(extra)} more than your average month`,
      })
    }
  }

  // Rule 7: month-over-month total spend
  const [y, mo] = month.split('-').map(Number)
  const prevDate  = new Date(y, mo - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  if (monthStats[month] && monthStats[prevMonth]) {
    const thisSpend = monthStats[month].spend
    const prevSpend = monthStats[prevMonth].spend
    if (prevSpend > 0) {
      const changePct = ((thisSpend - prevSpend) / prevSpend) * 100
      if (changePct > 15) {
        insights.push({
          severity: 'warning', category: null,
          title: `Total spend up ${pct(changePct)} vs last month`,
          body:  `${inr(thisSpend)} this month · ${inr(prevSpend)} last month`,
        })
      } else if (changePct < -15) {
        insights.push({
          severity: 'positive', category: null,
          title: `Total spend down ${pct(changePct)} vs last month`,
          body:  `${inr(thisSpend)} this month · ${inr(prevSpend)} last month`,
        })
      }
    }
  }

  // ── Rule 8: uncategorised transactions ────────────────────────────────────

  const uncatCount = thisD.filter(t => !t.category || t.category === 'Other').length
  if (uncatCount > 5) {
    insights.push({
      severity: 'warning', category: null,
      title: `${uncatCount} transactions need categorisation`,
      body:  `sitting in Other · review in Transactions`,
    })
  }

  // ── Rule 9: data freshness ────────────────────────────────────────────────

  const allDates = [...debits, ...credits].map(t => new Date(t.date).getTime())
  if (allDates.length > 0) {
    const latest    = new Date(Math.max(...allDates))
    const daysSince = Math.floor((Date.now() - latest.getTime()) / 86400000)
    if (daysSince > 35) {
      insights.push({
        severity: 'warning', category: null,
        title: `Data is ${Math.floor(daysSince / 7)} weeks old`,
        body:  `last transaction ${latest.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · consider uploading a new statement`,
      })
    }
  }

  return insights
}

// ── AI insights ───────────────────────────────────────────────────────────────

async function generateAIInsights(month, { debits, credits }) {
  const spendAll   = debits.filter(t => !EXCLUDE.has(t.category || 'Other'))
  const spendThis  = spendAll.filter(t => t.date.slice(0, 7) === month)
  const creditThis = credits.filter(t => t.date.slice(0, 7) === month)

  const totalSpend  = spendThis.reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalIncome = creditThis.reduce((s, t) => s + Math.abs(t.amount), 0)
  const savingsRate = totalIncome > 0
    ? Math.round(((totalIncome - totalSpend) / totalIncome) * 100)
    : 0

  // Category breakdown with historical average
  const byCat = {}
  for (const t of spendThis) {
    const c = t.category || 'Other'
    if (!byCat[c]) byCat[c] = { category: c, amount: 0, txnCount: 0 }
    byCat[c].amount   += Math.abs(t.amount)
    byCat[c].txnCount += 1
  }

  const priorByCat = {}
  for (const t of spendAll.filter(t => t.date.slice(0, 7) !== month)) {
    const c = t.category || 'Other'
    const m = t.date.slice(0, 7)
    if (!priorByCat[c]) priorByCat[c] = {}
    priorByCat[c][m] = (priorByCat[c][m] || 0) + Math.abs(t.amount)
  }

  const categoryBreakdown = Object.values(byCat).map(c => {
    const monthly = Object.values(priorByCat[c.category] || {})
    return {
      category:      c.category,
      amount:        Math.round(c.amount),
      txnCount:      c.txnCount,
      avgHistorical: monthly.length
        ? Math.round(monthly.reduce((s, v) => s + v, 0) / monthly.length)
        : 0,
    }
  }).sort((a, b) => b.amount - a.amount)

  // Top 10 merchants by amount
  const mMap = {}
  for (const t of spendThis) {
    const k = t.description
    if (!mMap[k]) mMap[k] = { merchant: t.description, amount: 0, txnCount: 0 }
    mMap[k].amount   += Math.abs(t.amount)
    mMap[k].txnCount += 1
  }
  const topMerchants = Object.values(mMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map(m => ({ ...m, amount: Math.round(m.amount) }))

  // Monthly totals for all months (sorted ascending)
  const allMonths = new Set([...debits, ...credits].map(t => t.date.slice(0, 7)))
  const monthlyTotals = Array.from(allMonths).sort().map(m => ({
    month:       m,
    totalSpend:  Math.round(spendAll.filter(t => t.date.slice(0, 7) === m).reduce((s, t) => s + Math.abs(t.amount), 0)),
    totalIncome: Math.round(credits.filter(t => t.date.slice(0, 7) === m).reduce((s, t) => s + Math.abs(t.amount), 0)),
  }))

  const payload = {
    month,
    totalSpend:  Math.round(totalSpend),
    totalIncome: Math.round(totalIncome),
    savingsRate,
    categoryBreakdown,
    topMerchants,
    monthlyTotals,
  }

  const msg = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are a personal finance analyst. You will be given aggregated financial data for a single user across multiple months. Your job is to identify 2-3 genuinely interesting patterns or observations that a financially aware person would find useful. Focus on trends, anomalies, and correlations — not obvious facts. Be specific with numbers. Keep each insight to one punchy sentence for the title and one supporting sentence for the body. Respond only in valid JSON array format:
[{ "title": string, "body": string, "severity": string, "category": string|null }]
severity must be one of: positive, warning, info`,
    messages: [{ role: 'user', content: JSON.stringify(payload) }],
  })

  let raw = msg.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const s = raw.indexOf('['), e = raw.lastIndexOf(']')
  if (s !== -1 && e !== -1) raw = raw.slice(s, e + 1)

  const results = JSON.parse(raw)
  return results.map(r => ({
    type:     'ai',
    category: r.category || null,
    severity: ['positive', 'warning', 'info'].includes(r.severity) ? r.severity : 'info',
    title:    String(r.title),
    body:     r.body ? String(r.body) : null,
  }))
}

// ── orchestrator ──────────────────────────────────────────────────────────────

async function generateAndStoreInsights(month, userId) {
  // Return cached insights if already generated for this month
  const { data: existing, error: existErr } = await supabase
    .from('insights')
    .select('*')
    .eq('month', month)
    .eq('user_id', userId)

  if (existErr) throw new Error(existErr.message)
  if (existing?.length > 0) {
    console.log(`[insights] ${month} — returning ${existing.length} cached insights`)
    return sortInsights(existing)
  }

  console.log(`[insights] ${month} — generating fresh insights`)

  // Fetch all transaction data once — shared between both engines
  const txData = await fetchAllTransactions(userId)

  // Rule engine (synchronous — always runs)
  let ruleInsights = []
  try {
    ruleInsights = generateRuleInsights(month, txData)
    console.log(`[insights] Rule engine → ${ruleInsights.length} insights`)
  } catch (err) {
    console.error('[insights] Rule engine error:', err.message)
  }

  // AI engine (async — non-fatal, degrades gracefully)
  let aiInsights = []
  try {
    aiInsights = await generateAIInsights(month, txData)
    console.log(`[insights] AI engine → ${aiInsights.length} insights`)
  } catch (err) {
    console.error('[insights] AI engine error (non-fatal):', err.message)
  }

  const rows = [
    ...ruleInsights.map(i => ({ ...i, type: 'rule', month, user_id: userId })),
    ...aiInsights.map(i => ({ ...i, month, user_id: userId })),
  ]

  if (rows.length === 0) {
    console.log(`[insights] ${month} — no insights generated`)
    return []
  }

  const { data: stored, error: storeErr } = await supabase
    .from('insights')
    .insert(rows)
    .select()

  if (storeErr) throw new Error(storeErr.message)
  console.log(`[insights] ${month} — stored ${stored.length} insights`)
  return sortInsights(stored)
}

module.exports = { generateAndStoreInsights }
