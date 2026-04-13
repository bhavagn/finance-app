function fmt(v) {
  const abs = Math.abs(v)
  if (abs >= 100000) return `₹${(Math.abs(v) / 100000).toFixed(1)}L`
  if (abs >= 1000) return `₹${(Math.abs(v) / 1000).toFixed(1)}k`
  return `₹${Math.round(Math.abs(v))}`
}

function InsightCard({ color, title, sub, onClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 3 }} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>{title}</div>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>
          {onClick ? (
            <button onClick={onClick} style={{ color: '#C9A84C', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}>
              {sub}
            </button>
          ) : sub}
        </div>
      </div>
    </div>
  )
}

export default function Insights({ data, onNavigate }) {
  const insights = []

  // 1. Biggest category increase vs 6-month average
  const biggestOver = data.categories
    ?.filter(c => c.delta > 0)
    ?.sort((a, b) => b.delta - a.delta)?.[0]
  if (biggestOver) {
    insights.push({
      color: '#E07B6A',
      title: `${biggestOver.category} is ${fmt(biggestOver.delta)} above your 6-month average`,
      sub: `avg ${fmt(biggestOver.sixMonthAvg)}/mo · this month ${fmt(biggestOver.total)}`,
    })
  }

  // 2. Savings rate vs 6-month average
  if (data.avgSavingsRate !== null) {
    const diff = data.savingsRate - data.avgSavingsRate
    const better = diff >= 0
    insights.push({
      color: better ? '#7EC891' : '#E07B6A',
      title: better
        ? `Savings rate of ${data.savingsRate}% is ${diff}pp above your average`
        : `Savings rate of ${data.savingsRate}% is ${Math.abs(diff)}pp below your average`,
      sub: `6-month avg: ${data.avgSavingsRate}%`,
    })
  }

  // 3. Uncategorised transactions
  if (data.uncategorisedCount > 0) {
    insights.push({
      color: '#9ca3af',
      title: `${data.uncategorisedCount} transaction${data.uncategorisedCount !== 1 ? 's' : ''} still uncategorised`,
      sub: 'Review and fix in Transactions →',
      onClick: () => onNavigate?.('transactions'),
    })
  }

  if (!insights.length) return null

  return (
    <div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-muted)', marginBottom: 10 }}>Insights</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {insights.map((ins, i) => (
          <InsightCard key={i} color={ins.color} title={ins.title} sub={ins.sub} onClick={ins.onClick} />
        ))}
      </div>
    </div>
  )
}
