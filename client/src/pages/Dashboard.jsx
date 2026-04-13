import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import FilterSelect from '../components/app/FilterSelect'
import KpiCard from '../components/app/KpiCard'
import CategoryBars from '../components/app/CategoryBars'
import ParentBars from '../components/app/ParentBars'
import SpendBars from '../components/app/SpendBars'
import SavingsDonut from '../components/app/SavingsDonut'
import Insights from '../components/app/Insights'

const INR = (v) => Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

function fmt(v) {
  const abs = Math.abs(v)
  if (abs >= 100000) return `₹${(Math.abs(v) / 100000).toFixed(1)}L`
  if (abs >= 1000) return `₹${(Math.abs(v) / 1000).toFixed(1)}k`
  return `₹${Math.round(Math.abs(v))}`
}

function currentYYYYMM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MONTH_OPTIONS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)
  return {
    value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: d.toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
  }
})

export default function Dashboard({ onNavigate }) {
  const [month, setMonth] = useState(currentYYYYMM())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.get(`/api/dashboard/overview?month=${month}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [month])

  const expensesDelta = data ? `${data.spentDelta >= 0 ? '+' : ''}${fmt(data.spentDelta)} vs ${data.prevMonthLabel}` : ''
  const expensesDeltaColor = data?.spentDelta > 0 ? 'var(--debit)' : 'var(--credit)'
  const incomeSub = data?.salaryDate
    ? `salary credited ${data.salaryDate}`
    : `${data?.incomeTxCount ?? 0} credit transactions`
  const savingsRateVsAvg = data?.avgSavingsRate !== null && data?.avgSavingsRate !== undefined
    ? `avg ${data.avgSavingsRate}% over 6 months`
    : null

  return (
    <div className="max-w-6xl mx-auto px-6 py-8" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header + month filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontWeight: 300, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
            {loading ? '—' : (data?.monthLabel ?? '—')}
          </h1>
          <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {loading ? 'Loading…' : `${data?.txCount ?? 0} transactions${data?.parsedDate ? ` · statement parsed ${data.parsedDate}` : ''}`}
          </p>
        </div>
        <FilterSelect value={month} onChange={setMonth} options={MONTH_OPTIONS} />
      </div>

      {error && <p style={{ fontSize: 12, color: 'var(--debit)' }}>Error: {error}</p>}

      {!loading && data && (
        <>
          {/* KPI row — 5 cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            <KpiCard
              label="Income"
              value={INR(data.totalIncome)}
              valueColor="var(--credit)"
              sub={incomeSub}
            />
            <KpiCard
              label="Expenses"
              value={INR(data.totalExpenses)}
              valueColor="var(--debit)"
              sub={expensesDelta}
              subColor={expensesDeltaColor}
              borderTint="rgba(224,123,106,0.15)"
            />
            <KpiCard
              label="Invested"
              value={INR(data.totalInvested)}
              valueColor="var(--gold)"
              sub={data.totalInvested > 0 ? `${Math.round((data.totalInvested / data.totalIncome) * 100)}% of income` : 'no investments'}
              borderTint="rgba(201,168,76,0.1)"
            />
            <KpiCard
              label="Saved"
              value={INR(data.savedAmount)}
              valueColor={data.savedAmount >= 0 ? 'var(--credit)' : 'var(--debit)'}
              sub={`avg ${fmt(data.avgPerDay)}/day`}
            />
            <KpiCard
              label="Savings rate"
              value={`${data.savingsRate}%`}
              valueColor="var(--gold)"
              sub={savingsRateVsAvg}
              borderTint="rgba(201,168,76,0.1)"
            />
          </div>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: 12 }}>
            <CategoryBars categories={data.categories} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ParentBars categories={data.categories} />
              <SpendBars trends={data.trends} />
              <SavingsDonut
                savingsRate={data.savingsRate}
                totalIncome={data.totalIncome}
                totalSpent={data.totalSpent}
                savedAmount={data.savedAmount}
              />
            </div>
          </div>

          <Insights data={data} onNavigate={onNavigate} />
        </>
      )}
    </div>
  )
}
