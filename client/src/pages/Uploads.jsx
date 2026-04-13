import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getSourceLabel } from '@/lib/categories'

const CHIP_BASE   = { fontSize: 11, padding: '5px 11px', borderRadius: 20, border: '0.5px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer' }
const CHIP_ACTIVE = { ...CHIP_BASE, background: 'rgba(201,168,76,0.1)', border: '0.5px solid rgba(201,168,76,0.35)', color: 'var(--gold)' }

const STATUS_STYLE = {
  parsed:     { background: 'rgba(126,200,145,0.1)', color: '#7EC891' },
  failed:     { background: 'rgba(224,123,106,0.1)', color: '#E07B6A' },
  processing: { background: 'rgba(201,168,76,0.1)',  color: '#C9A84C' },
  pending:    { background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' },
}

const TH = { fontSize: 9, textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', fontWeight: 400, padding: '8px 16px', textAlign: 'left', borderBottom: '0.5px solid rgba(255,255,255,0.06)', letterSpacing: '0.06em' }
const TD = { padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' }

function fmtUploaded(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
function fmtPeriod(start, end) {
  if (!start) return '—'
  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
  return `${fmt(start)} – ${fmt(end)}`
}
function fmtMonth(d) {
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}

export default function Uploads() {
  const [uploads, setUploads]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  async function load() {
    setLoading(true); setError(null)
    try { setUploads(await api.get('/api/uploads')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function handleDelete(upload) {
    if (!window.confirm(`Delete "${upload.file_name}"?\n\nThis will permanently delete the upload and all ${upload.transaction_count} of its transactions. This cannot be undone.`)) return
    setDeleting(upload.id)
    try {
      await api.delete(`/api/uploads/${upload.id}`)
      setUploads((prev) => prev.filter((u) => u.id !== upload.id))
    } catch (e) { alert(`Failed to delete: ${e.message}`) }
    finally { setDeleting(null) }
  }

  // Subtitle: date range from real data
  const dates = uploads.map((u) => new Date(u.created_at)).filter((d) => !isNaN(d))
  const subtitle = uploads.length === 0
    ? '0 uploads'
    : dates.length >= 2
      ? `${uploads.length} uploads · ${fmtMonth(new Date(Math.min(...dates)))} – ${fmtMonth(new Date(Math.max(...dates)))}`
      : `${uploads.length} upload${uploads.length > 1 ? 's' : ''}`

  const filtered = statusFilter === 'all' ? uploads : uploads.filter((u) => u.status === statusFilter)

  return (
    <div className="max-w-6xl mx-auto px-6 py-8" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontWeight: 300, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Upload history</h1>
          <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {loading && uploads.length === 0 ? 'Loading…' : subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
          {['all', 'parsed', 'failed'].map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)} style={statusFilter === f ? CHIP_ACTIVE : CHIP_BASE}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ fontSize: 12, color: 'var(--debit)', margin: 0 }}>Error: {error}</p>}

      {/* Table panel */}
      <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading && uploads.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              {statusFilter === 'failed' ? 'No failed uploads' : 'No uploads yet'}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', opacity: 0.6 }}>
              {statusFilter === 'failed' ? 'All statements parsed successfully' : 'Upload a statement to get started'}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: 80 }}>Uploaded</th>
                <th style={TH}>File</th>
                <th style={{ ...TH, width: 110 }}>Source</th>
                <th style={{ ...TH, width: 150 }}>Period</th>
                <th style={{ ...TH, width: 50, textAlign: 'right' }}>Txns</th>
                <th style={{ ...TH, width: 80 }}>Status</th>
                <th style={{ ...TH, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const isLast = i === filtered.length - 1
                const rowTD = isLast ? { ...TD, borderBottom: 'none' } : TD
                return (
                  <tr key={u.id}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={rowTD}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {fmtUploaded(u.created_at)}
                      </span>
                    </td>
                    <td style={{ ...rowTD, maxWidth: 0 }}>
                      <span style={{ fontSize: 12, color: 'rgba(226,221,214,0.72)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.file_name}>
                        {u.file_name}
                      </span>
                    </td>
                    <td style={rowTD}>
                      <span style={{ fontSize: 11, color: 'rgba(226,221,214,0.45)', whiteSpace: 'nowrap' }}>
                        {getSourceLabel(u.source)}
                      </span>
                    </td>
                    <td style={rowTD}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {fmtPeriod(u.statement_period_start, u.statement_period_end)}
                      </span>
                    </td>
                    <td style={{ ...rowTD, textAlign: 'right' }}>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-primary)' }}>
                        {u.transaction_count > 0 ? u.transaction_count : '—'}
                      </span>
                    </td>
                    <td style={rowTD}>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono, monospace)', borderRadius: 3, padding: '2px 7px', ...(STATUS_STYLE[u.status] || STATUS_STYLE.pending) }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={rowTD}>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={deleting === u.id}
                        style={{ fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: deleting === u.id ? 'var(--text-muted)' : 'rgba(224,123,106,0.4)', background: 'none', border: 'none', cursor: deleting === u.id ? 'default' : 'pointer', padding: 0 }}
                        onMouseEnter={(e) => { if (deleting !== u.id) e.currentTarget.style.color = '#E07B6A' }}
                        onMouseLeave={(e) => { if (deleting !== u.id) e.currentTarget.style.color = 'rgba(224,123,106,0.4)' }}
                      >
                        {deleting === u.id ? '…' : 'del'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
