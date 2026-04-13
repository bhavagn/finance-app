import CategorySelect from './CategorySelect'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function formatAmount(amount) {
  return Number(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })
}

const TH = { fontSize: 10, textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', fontWeight: 400, padding: '8px 16px', textAlign: 'left', borderBottom: '0.5px solid rgba(255,255,255,0.06)', letterSpacing: '0.06em' }
const TD = { padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' }

export default function TxTable({ transactions, onCategoryChange }) {
  if (!transactions.length) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>No transactions found</div>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', opacity: 0.6 }}>
          Try adjusting your filters or search term
        </div>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={TH}>Date</th>
            <th style={TH}>Description</th>
            <th style={TH}>Category</th>
            <th style={TH}>Type</th>
            <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr
              key={t.id}
              style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.012)' : 'transparent', cursor: 'default' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.012)' : 'transparent' }}
            >
              <td style={TD}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {formatDate(t.date)}
                </span>
              </td>
              <td style={{ ...TD, maxWidth: 280 }}>
                <span style={{ fontSize: 12, color: 'rgba(226,221,214,0.78)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.description}>
                  {t.description}
                </span>
              </td>
              <td style={TD}>
                <CategorySelect
                  transactionId={t.id}
                  currentCategory={t.category}
                  onCategoryChange={(cat) => onCategoryChange(t.id, cat)}
                />
              </td>
              <td style={TD}>
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono, monospace)', color: t.type === 'debit' ? 'var(--debit)' : 'var(--credit)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t.type}
                </span>
              </td>
              <td style={{ ...TD, textAlign: 'right', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono, monospace)', color: t.type === 'debit' ? 'var(--debit)' : 'var(--credit)', fontWeight: 500 }}>
                  {formatAmount(t.amount)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
