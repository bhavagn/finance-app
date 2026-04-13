const Anthropic = require('@anthropic-ai/sdk')
const supabase = require('./supabase')
const { getParent } = require('../lib/categories')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BATCH_SIZE = 100

const CATEGORISATION_SYSTEM_PROMPT = `You are an expert financial transaction categoriser for Indian spending patterns.

For each transaction, reason about what kind of business, service, or activity it represents and assign the most accurate subcategory.

Subcategories (grouped by parent — you must return a subcategory name exactly as listed):

Food: Food & Dining, Groceries
Transport: Transport, Fuel
Shopping: Shopping
Lifestyle: Entertainment, Travel, Personal Care, Subscriptions, Donations
Utilities: Utilities
Healthcare: Healthcare
Household: Household Help, Rent
Financial: Insurance, EMI
Investments: Gold, Mutual Funds, Stocks, Chit Fund
Income: Salary
Pass-through: Credit Card Payment, Transfers, Fees & Charges
Other: Other

Reasoning guidelines:
- Swiggy, Zomato, restaurants, dhabas, tea stalls, dosa stalls, food stalls, bakeries, Pista House, any food establishment → Food & Dining
- Blinkit, Zepto, DMart, BigBasket, grocery, supermarket → Groceries
- Rapido, Uber, Ola, auto, cab, BMTC, bus, metro, toll, parking, transport → Transport
- Petrol, fuel, filling station, HP, Indian Oil, BPCL → Fuel
- Amazon, Flipkart, Myntra, Zudio, retail stores, any shop selling physical goods → Shopping
- BookMyShow, cinema, events, amusement → Entertainment
- Flight, hotel booking, MakeMyTrip, Cleartrip, Goibibo, holiday → Travel
- Dry cleaning, SVP, laundry, salon, spa, Urban Company, barber → Personal Care
- Netflix, Hotstar, JioHotstar, Spotify, OTT, streaming, subscription → Subscriptions
- Foundation, trust, NGO, Ekathva, charitable, donation → Donations
- Electricity, water, gas, internet, phone, Jio, Airtel, Vi, recharge, broadband → Utilities
- Hospital, pharmacy, doctor, medical, clinic, Sunray, Apollo → Healthcare
- Maid, cook, household help, domestic help, cleaning staff, driver salary → Household Help
- Rent, house rent, PG, accommodation → Rent
- LIC, insurance premium, vehicle insurance, health insurance, Star Health, HDFC Ergo → Insurance
- EMI, loan repayment, home loan, car loan, personal loan → EMI
- SafeGold, MMTCPAMP, digital gold, gold purchase → Gold
- Groww, Zerodha, mutual fund, SIP, MF → Mutual Funds
- Stocks, shares, equity, NSE, BSE → Stocks
- Chit fund, chit → Chit Fund
- Salary, employer, payroll, NSCM → Salary
- CRED, credit card payment, CC bill, card payment → Credit Card Payment
- Bank charges, GST, IGST, penalty, fine, processing fee → Fees & Charges
- ONLY classify as Transfers when sending money to a clear individual person name with absolutely no business context. Any description with a business word (Ltd, Pvt, Company, Shop, Store, Mart, Palace, House, Filling, Pharmacy, Foundation, Automobile, Plastic, Cleaning) is NOT a transfer — use the appropriate category.

Return raw JSON array only, no markdown: [{"id": "transaction_id", "category": "subcategory_name"}]`

/**
 * Send a batch of {id, description} transactions to Claude and write categories to DB.
 * Returns { categorised, failed }.
 */
async function categoriseBatch(transactions) {
  if (!transactions || transactions.length === 0) return { categorised: 0, failed: 0 }

  const payload = transactions.map((t) => ({ id: t.id, description: t.description }))

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: CATEGORISATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(payload) }],
  })

  let raw = message.content[0].text
  raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const arrayStart = raw.indexOf('[')
  const arrayEnd = raw.lastIndexOf(']')
  if (arrayStart !== -1 && arrayEnd !== -1) raw = raw.substring(arrayStart, arrayEnd + 1)

  let results = []
  try {
    results = JSON.parse(raw)
  } catch {
    console.error('[categoriser] Failed to parse Claude response:', raw.slice(0, 200))
    return { categorised: 0, failed: transactions.length }
  }

  // Group by category so we can bulk-update per group instead of one call per transaction
  const byCat = {}
  for (const result of results) {
    if (!result.id || !result.category) continue
    if (!byCat[result.category]) byCat[result.category] = []
    byCat[result.category].push(result.id)
  }

  let categorised = 0
  let failed = 0
  for (const [category, ids] of Object.entries(byCat)) {
    const parent_category = getParent(category)
    const { error } = await supabase
      .from('transactions')
      .update({ category, parent_category })
      .in('id', ids)
    if (error) {
      console.error(`[categoriser] Bulk update failed for "${category}":`, error.message)
      failed += ids.length
    } else {
      categorised += ids.length
    }
  }

  return { categorised, failed }
}

/**
 * Categorise all uncategorised transactions for a single upload.
 * Called automatically after PDF parsing.
 */
async function categoriseTransactions(uploadId) {
  console.log('[categoriser] Starting categorisation for upload:', uploadId)

  const { data: transactions, error: fetchError } = await supabase
    .from('transactions')
    .select('id, description')
    .eq('upload_id', uploadId)
    .is('category', null)
    .limit(5000)  // guard against PostgREST default row cap

  if (fetchError) throw new Error(`Failed to fetch transactions: ${fetchError.message}`)
  if (!transactions || transactions.length === 0) {
    console.log('[categoriser] No uncategorised transactions found')
    return
  }
  console.log('[categoriser]', transactions.length, 'uncategorised transactions')

  let totalCategorised = 0
  let batchCount = 0
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE)
    batchCount++
    console.log(`[categoriser] batch ${batchCount} — sending ${batch.length} to Claude`)
    const result = await categoriseBatch(batch)
    totalCategorised += result.categorised
  }

  console.log(`[categoriser] Done — ${totalCategorised}/${transactions.length} categorised across ${batchCount} batch(es)`)
}

/**
 * Reset all transaction categories to NULL.
 * Run before a fresh categorise-all.
 */
async function resetTransactionCategories(userId) {
  console.log('[categoriser] Resetting transaction categories to NULL for user:', userId)
  const { error } = await supabase
    .from('transactions')
    .update({ category: null, parent_category: null })
    .eq('user_id', userId)
  if (error) throw new Error(`Failed to reset categories: ${error.message}`)
  console.log('[categoriser] Reset done')
}

module.exports = { categoriseTransactions, categoriseBatch, resetTransactionCategories }
