import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import { CATEGORIES, PARENT_CATEGORIES, SOURCE_OPTIONS } from '@/lib/categories'
import FilterSelect from '@/components/app/FilterSelect'
import TxTable from '@/components/app/TxTable'

const INR = (v) => Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)
  return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('en-IN', { month: 'short', year: 'numeric' }) }
})

// Grouped category options for FilterSelect
const CATEGORY_GROUPED = PARENT_CATEGORIES.map((parent) => ({
  group: parent,
  options: CATEGORIES.filter((c) => c.parent === parent).map((c) => ({ value: c.subcategory, label: c.subcategory })),
}))

const CHIP_BASE = { fontSize: 11, padding: '5px 11px', borderRadius: 20, border: '0.5px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }
const CHIP_ACTIVE = { ...CHIP_BASE, background: 'rgba(201,168,76,0.1)', border: '0.5px solid rgba(201,168,76,0.35)', color: 'var(--gold)' }

const KpiMini = ({ label, value, color }) => (
  <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '10px 14px', minWidth: 140 }}>
    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 18, fontWeight: 500, color }}>{value}</div>
  </div>
)

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  useEffect(() => {
    setLoading(true); setError(null)
    const p = new URLSearchParams()
    if (filterMonth) p.set('month', filterMonth)
    if (filterSource) p.set('source', filterSource)
    if (filterCategory) p.set('category', filterCategory)
    api.get(`/api/transactions?${p}`)
      .then((data) => setTransactions(data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [filterMonth, filterSource, filterCategory])

  useEffect(() => { setTypeFilter('all'); setPage(1) }, [filterMonth, filterSource, filterCategory])
  useEffect(() => { setPage(1) }, [search, typeFilter, pageSize])

  const visible = useMemo(() => {
    let r = transactions
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      r = r.filter((t) => t.description?.toLowerCase().includes(q))
    }
    if (typeFilter === 'debit' || typeFilter === 'credit') r = r.filter((t) => t.type === typeFilter)
    return r
  }, [transactions, search, typeFilter])

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize))
  const clampedPage = Math.min(page, totalPages)
  const pageStart = (clampedPage - 1) * pageSize
  const paginated = visible.slice(pageStart, pageStart + pageSize)
  const rangeEnd = Math.min(pageStart + pageSize, visible.length)

  const totalDebit = visible.filter((t) => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0)
  const totalCredit = visible.filter((t) => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0)

  const filterParts = [
    filterMonth && (MONTH_OPTIONS.find((m) => m.value === filterMonth)?.label ?? filterMonth),
    filterSource && (SOURCE_OPTIONS.find((s) => s.value === filterSource)?.label ?? filterSource),
    filterCategory,
    search.trim() && `"${search.trim().slice(0, 24)}"`,
    typeFilter !== 'all' && (typeFilter === 'debit' ? 'debits' : 'credits'),
  ].filter(Boolean)
  const filterSummary = filterParts.length ? filterParts.join(' · ') : 'all'

  function handleCategoryChange(id, category) {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, category } : t)))
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontWeight: 300, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Transactions</h1>
        <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {transactions.length} total · showing {filterSummary}
        </p>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8.5 8.5L11.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by merchant, UPI ID, or description…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        )}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <FilterSelect value={filterMonth} onChange={setFilterMonth} options={MONTH_OPTIONS} placeholder="All months" />
        <FilterSelect value={filterSource} onChange={setFilterSource} options={SOURCE_OPTIONS} placeholder="All sources" />
        <FilterSelect value={filterCategory} onChange={setFilterCategory} groupedOptions={CATEGORY_GROUPED} placeholder="All categories" />
        {(filterMonth || filterSource || filterCategory) && (
          <button onClick={() => { setFilterMonth(''); setFilterSource(''); setFilterCategory('') }} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
        )}
      </div>

      {/* Quick-filter chips */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {['all', 'debit', 'credit'].map((f) => (
          <button key={f} onClick={() => setTypeFilter(f)} style={typeFilter === f ? CHIP_ACTIVE : CHIP_BASE}>
            {f === 'all' ? 'All' : f === 'debit' ? 'Debits' : 'Credits'}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 10 }}>
        <KpiMini label="Total Debit" value={INR(totalDebit)} color="var(--debit)" />
        <KpiMini label="Total Credit" value={INR(totalCredit)} color="var(--credit)" />
      </div>

      {error && <p style={{ fontSize: 12, color: 'var(--debit)' }}>{error}</p>}

      <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading
          ? <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>Loading…</p>
          : <TxTable transactions={paginated} onCategoryChange={handleCategoryChange} />
        }
      </div>

      {/* Pagination */}
      {!loading && visible.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Rows per page</span>
            <FilterSelect
              value={String(pageSize)}
              onChange={(v) => setPageSize(Number(v))}
              options={[{ value: '25', label: '25' }, { value: '50', label: '50' }, { value: '100', label: '100' }]}
            />
          </div>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)' }}>
            {visible.length === 0 ? '0 transactions' : `${pageStart + 1}–${rangeEnd} of ${visible.length} transactions`}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ label: 'Previous', disabled: clampedPage <= 1, onClick: () => setPage((p) => p - 1) },
              { label: 'Next', disabled: clampedPage >= totalPages, onClick: () => setPage((p) => p + 1) }]
              .map(({ label, disabled, onClick }) => (
                <button key={label} onClick={onClick} disabled={disabled}
                  style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 14px', fontSize: 12, color: 'var(--text-secondary)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.3 : 1, fontFamily: 'var(--font-sans)' }}
                  onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                  onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
                >
                  {label}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
