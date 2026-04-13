const CATEGORY_COLORS = {
  'Food & Dining': '#E07B6A',
  'Fuel': '#C9A84C',
  'Transport': '#9B7FD4',
  'Shopping': '#7B9FD4',
  'Groceries': '#7EC891',
  'Personal Care': '#6ABDC8',
  'Travel': '#5BB3A8',
  'Subscriptions': '#B07BD4',
}
const DEFAULT_COLOR = '#8892A4'

function fmt(v) {
  const abs = Math.abs(v)
  if (abs >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (abs >= 1000) return `₹${(Math.abs(v) / 1000).toFixed(1)}k`
  return `₹${Math.round(Math.abs(v))}`
}

export default function CategoryBars({ categories }) {
  if (!categories?.length) return (
    <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No spend data for this period.</p>
    </div>
  )

  const maxVal = Math.max(...categories.map(c => Math.max(c.total, c.sixMonthAvg)))

  return (
    <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
      {/* Panel header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>Where your money went</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>vs 6-mo avg</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map((cat) => {
          const color = CATEGORY_COLORS[cat.category] || DEFAULT_COLOR
          const barPct = maxVal > 0 ? (cat.total / maxVal) * 100 : 0
          const avgPct = maxVal > 0 ? (cat.sixMonthAvg / maxVal) * 100 : 0
          const isOver = cat.delta > 0

          return (
            <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 22 }}>
              {/* Label */}
              <div style={{ width: 82, textAlign: 'right', flexShrink: 0, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cat.category}
              </div>

              {/* Bar track */}
              <div style={{ flex: 1, position: 'relative', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                <div style={{ width: `${barPct}%`, height: '100%', background: color, borderRadius: 3 }} />
                {avgPct > 0 && (
                  <div style={{ position: 'absolute', left: `${avgPct}%`, top: 0, width: 2, height: '100%', background: 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
                )}
              </div>

              {/* Amount */}
              <div style={{ width: 54, textAlign: 'right', flexShrink: 0, fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-secondary)' }}>
                {fmt(cat.total)}
              </div>

              {/* Delta */}
              <div style={{ width: 40, textAlign: 'right', flexShrink: 0, fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: isOver ? '#E07B6A' : '#7EC891' }}>
                {cat.delta !== 0 ? `${isOver ? '+' : ''}${fmt(cat.delta)}` : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
