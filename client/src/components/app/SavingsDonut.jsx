const R = 32
const CX = 44
const CY = 44
const CIRCUMFERENCE = 2 * Math.PI * R

const INR = (v) => Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

function Row({ color, label, amount }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-primary)' }}>{INR(amount)}</div>
    </div>
  )
}

export default function SavingsDonut({ savingsRate, totalIncome, totalSpent, savedAmount }) {
  const rate = Math.max(0, Math.min(100, savingsRate || 0))
  const filled = (rate / 100) * CIRCUMFERENCE
  const gap = CIRCUMFERENCE - filled

  return (
    <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 14 }}>Savings rate</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Donut */}
        <div style={{ flexShrink: 0 }}>
          <svg width={CX * 2} height={CY * 2} viewBox={`0 0 ${CX * 2} ${CY * 2}`}>
            {/* Track */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={7}
            />
            {/* Progress */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="#C9A84C"
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={`${filled} ${gap}`}
              transform={`rotate(-90 ${CX} ${CY})`}
            />
            {/* Center label */}
            <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 13, fontWeight: 500, fill: '#C9A84C' }}>
              {rate}%
            </text>
          </svg>
        </div>

        {/* Breakdown rows */}
        <div style={{ flex: 1 }}>
          <Row color="#7EC891" label="Income" amount={totalIncome} />
          <Row color="#E07B6A" label="Spent" amount={totalSpent} />
          <Row color="#C9A84C" label="Saved" amount={savedAmount} />
        </div>
      </div>
    </div>
  )
}
