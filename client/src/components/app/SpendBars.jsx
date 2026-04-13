const GOLD = '#C9A84C'

export default function SpendBars({ trends }) {
  if (!trends?.length) return null

  const maxTotal = Math.max(...trends.map(t => t.total), 1)

  return (
    <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 14 }}>Monthly spend</div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 72 }}>
        {trends.map((t) => {
          const heightPct = (t.total / maxTotal) * 100
          return (
            <div key={t.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 5, height: '100%' }}>
              <div
                style={{
                  width: '100%',
                  height: `${Math.max(heightPct, 3)}%`,
                  background: t.isCurrent ? GOLD : 'rgba(201,168,76,0.2)',
                  borderRadius: '2px 2px 0 0',
                }}
              />
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono, monospace)', color: t.isCurrent ? GOLD : 'var(--text-muted)' }}>
                {t.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
