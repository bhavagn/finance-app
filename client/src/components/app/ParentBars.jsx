import { getParent } from '@/lib/categories'

const PARENT_COLORS = {
  Food:         '#E07B6A',
  Transport:    '#9B7FD4',
  Shopping:     '#5B9BD5',
  Lifestyle:    '#E8A87C',
  Utilities:    '#7EC891',
  Healthcare:   '#F06292',
  Household:    '#4DB6AC',
  Financial:    '#FFB74D',
  Investments:  '#C9A84C',
  Other:        '#9ca3af',
}

const INR = (v) => Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export default function ParentBars({ categories }) {
  if (!categories?.length) return null

  // Group subcategory totals by parent
  const parentTotals = {}
  for (const c of categories) {
    const parent = getParent(c.category)
    if (parent === 'Pass-through' || parent === 'Income') continue
    parentTotals[parent] = (parentTotals[parent] || 0) + c.total
  }

  const parents = Object.entries(parentTotals)
    .map(([parent, total]) => ({ parent, total }))
    .sort((a, b) => b.total - a.total)

  if (!parents.length) return null

  const max = parents[0].total

  return (
    <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 14 }}>By category</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {parents.map(({ parent, total }) => {
          const pct = max > 0 ? (total / max) * 100 : 0
          const color = PARENT_COLORS[parent] || '#9ca3af'
          return (
            <div key={parent}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{parent}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-primary)' }}>{INR(total)}</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', borderRadius: 2, background: color, width: `${pct}%`, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
