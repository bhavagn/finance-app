const CARD_BASE = {
  background: 'var(--bg-surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '14px 16px',
}

export default function KpiCard({ label, value, valueColor, sub, subColor, borderTint }) {
  const style = borderTint
    ? { ...CARD_BASE, border: `0.5px solid ${borderTint}` }
    : CARD_BASE

  return (
    <div style={style}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-muted)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 22, fontWeight: 500, color: valueColor || 'var(--text-primary)', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: subColor || 'var(--text-muted)', marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  )
}
