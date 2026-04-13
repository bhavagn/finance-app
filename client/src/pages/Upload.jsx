import { useState, useRef } from 'react'
import { api } from '@/lib/api'

const fmtSize = (b) => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`

const BankIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8h16M10 2l8 6H2l8-6z" /><path d="M4 8v8M8 8v8M12 8v8M16 8v8" /><path d="M2 16h16" />
  </svg>
)
const CardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="18" height="13" rx="2" /><path d="M1 8h18M5 13h3" />
  </svg>
)

function makeItem(file) {
  return {
    id: Math.random().toString(36).slice(2, 10),
    file,
    accountType: null,
    status: 'pending',   // pending | uploading | success | warning | error | undetected
    result: null,
    error: null,
    availableSources: [],
    fallbackSource: '',
  }
}

function TypeToggle({ value, onChange }) {
  const base = { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border)', background: 'transparent', transition: 'all 0.12s' }
  const active = { ...base, borderColor: 'rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.08)', color: 'var(--text-primary)' }
  const inactive = { ...base, color: 'var(--text-muted)' }
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button style={value === 'bank' ? active : inactive} onClick={() => onChange('bank')}>
        <BankIcon /> Bank
      </button>
      <button style={value === 'credit_card' ? active : inactive} onClick={() => onChange('credit_card')}>
        <CardIcon /> Credit Card
      </button>
    </div>
  )
}

function SourceSelect({ sources, value, onChange }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', background: 'var(--bg-base)', border: '0.5px solid rgba(201,168,76,0.3)', borderRadius: 'var(--radius-md)' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ appearance: 'none', WebkitAppearance: 'none', background: 'transparent', border: 'none', outline: 'none', padding: '5px 28px 5px 10px', fontSize: 11, color: value ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
      >
        <option value="" disabled>Select bank</option>
        {sources.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ position: 'absolute', right: 9, pointerEvents: 'none', color: 'var(--text-muted)' }}>
        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function QueueCard({ item, onUpdate, onRemove, onUpload }) {
  const { id, file, accountType, status, result, error, availableSources, fallbackSource } = item

  const isActive = status === 'pending' || status === 'undetected'
  const canRetry = status === 'undetected' && fallbackSource

  const borderColor = status === 'success' ? 'rgba(126,200,145,0.2)'
    : status === 'error' ? 'rgba(224,123,106,0.2)'
    : status === 'warning' ? 'rgba(201,168,76,0.25)'
    : status === 'undetected' ? 'rgba(201,168,76,0.25)'
    : 'var(--border)'

  return (
    <div style={{ background: 'var(--bg-surface)', border: `0.5px solid ${borderColor}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.2s' }}>

      {/* Row 1: file info + remove */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {/* Status icon */}
          {status === 'uploading' && (
            <svg className="animate-spin" width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
              <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          {status === 'success' && (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="6" stroke="#7EC891" strokeWidth="1.2" />
              <path d="M4.5 7l2 2 3-3" stroke="#7EC891" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {status === 'error' && (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="6" stroke="#E07B6A" strokeWidth="1.2" />
              <path d="M5 5l4 4M9 5l-4 4" stroke="#E07B6A" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          )}
          {(status === 'pending' || status === 'warning' || status === 'undetected') && (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
              <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4.5 5.5h5M4.5 7.5h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            </svg>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtSize(file.size)}</div>
          </div>
        </div>
        {status !== 'uploading' && (
          <button onClick={() => onRemove(id)} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, opacity: 0.5 }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.5}
          >✕</button>
        )}
      </div>

      {/* Row 2: account type (only for active/pending) */}
      {isActive && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <TypeToggle value={accountType} onChange={(v) => onUpdate(id, { accountType: v, status: 'pending', error: null, availableSources: [], fallbackSource: '' })} />
          <button
            onClick={() => onUpload(item)}
            disabled={!accountType && !canRetry}
            style={{ fontSize: 11, fontWeight: 500, background: 'var(--gold)', color: '#1A1200', borderRadius: 'var(--radius-md)', padding: '5px 14px', border: 'none', cursor: (!accountType && !canRetry) ? 'not-allowed' : 'pointer', opacity: (!accountType && !canRetry) ? 0.35 : 1, whiteSpace: 'nowrap' }}
          >
            Upload
          </button>
        </div>
      )}

      {/* Row 3: undetected fallback */}
      {status === 'undetected' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(201,168,76,0.8)', whiteSpace: 'nowrap' }}>Couldn't detect bank —</span>
          <SourceSelect sources={availableSources} value={fallbackSource} onChange={(v) => onUpdate(id, { fallbackSource: v })} />
        </div>
      )}

      {/* Row 4: success summary */}
      {status === 'success' && result && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#7EC891' }}>{result.transaction_count} transactions</span>
          {result.statement_period?.start && (
            <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {result.statement_period.start} → {result.statement_period.end}
            </span>
          )}
          {result.duplicates_removed > 0 && (
            <span className="font-mono" style={{ fontSize: 10, color: 'var(--gold)', background: 'rgba(201,168,76,0.08)', border: '0.5px solid rgba(201,168,76,0.25)', borderRadius: 3, padding: '1px 7px' }}>
              {result.duplicates_removed} duplicate{result.duplicates_removed > 1 ? 's' : ''} removed
            </span>
          )}
        </div>
      )}

      {/* Row 5: warning (already uploaded) */}
      {status === 'warning' && error && (
        <div style={{ fontSize: 11, color: 'var(--gold)' }}>{error}</div>
      )}

      {/* Row 6: error */}
      {status === 'error' && error && (
        <div style={{ fontSize: 11, color: 'var(--debit)' }}>{error}</div>
      )}
    </div>
  )
}

export default function Upload() {
  const [queue, setQueue] = useState([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  function addFiles(fileList) {
    const pdfs = Array.from(fileList).filter((f) => f.type === 'application/pdf')
    if (pdfs.length === 0) return
    setQueue((prev) => [...prev, ...pdfs.map(makeItem)])
  }

  function updateItem(id, patch) {
    setQueue((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  function removeItem(id) {
    setQueue((prev) => prev.filter((i) => i.id !== id))
  }

  async function uploadItem(item) {
    if (!item.accountType) {
      updateItem(item.id, { error: 'Select Bank Account or Credit Card first.', status: 'pending' })
      return
    }
    updateItem(item.id, { status: 'uploading', error: null })
    try {
      const form = new FormData()
      form.append('file', item.file)
      form.append('accountType', item.accountType)
      if (item.status === 'undetected' && item.fallbackSource) form.append('source', item.fallbackSource)
      const result = await api.postForm('/api/parse-pdf', form)
      updateItem(item.id, { status: 'success', result })
    } catch (err) {
      if (err.error === 'bank_undetected' || err.message === 'bank_undetected') {
        updateItem(item.id, { status: 'undetected', availableSources: err.availableSources ?? [], error: null })
      } else if (err.message?.includes('already been uploaded')) {
        updateItem(item.id, { status: 'warning', error: err.message })
      } else {
        updateItem(item.id, { status: 'error', error: err.message })
      }
    }
  }

  async function uploadAllPending() {
    const pending = queue.filter((i) => i.status === 'pending' || (i.status === 'undetected' && i.fallbackSource))
    for (const item of pending) {
      // Re-read latest item state before uploading
      await uploadItem(item)
    }
  }

  const pendingCount = queue.filter((i) => i.status === 'pending').length
  const hasAnyPending = queue.some((i) => i.status === 'pending' || (i.status === 'undetected' && i.fallbackSource))

  const dropzoneBorder = dragging ? 'rgba(201,168,76,0.6)' : queue.length === 0 ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.08)'
  const dropzoneBg = dragging ? 'rgba(201,168,76,0.06)' : 'transparent'

  return (
    <div className="max-w-2xl mx-auto px-6 py-8" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontWeight: 300, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Upload statements</h1>
          <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Bank accounts &amp; credit cards · bank detected automatically
          </p>
        </div>
        {hasAnyPending && (
          <button
            onClick={uploadAllPending}
            style={{ fontSize: 12, fontWeight: 500, background: 'var(--gold)', color: '#1A1200', borderRadius: 'var(--radius-md)', padding: '8px 18px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Upload all{pendingCount > 1 ? ` (${pendingCount})` : ''}
          </button>
        )}
      </div>

      {/* Drop zone — always visible as an "add more" area */}
      <div
        style={{ border: `0.5px dashed ${dropzoneBorder}`, borderRadius: 'var(--radius-lg)', background: dropzoneBg, padding: queue.length === 0 ? '40px 20px' : '16px 20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
        onClick={() => fileInputRef.current?.click()}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.background = 'rgba(201,168,76,0.03)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = dropzoneBorder; e.currentTarget.style.background = dropzoneBg }}
      >
        <input ref={fileInputRef} type="file" accept="application/pdf" multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />
        {queue.length === 0 ? (
          <>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ margin: '0 auto 12px', opacity: 0.3, color: 'var(--gold)' }}>
              <rect x="6" y="3" width="20" height="26" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M20 3v7h6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M10 17h12M10 22h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 13, color: 'rgba(226,221,214,0.45)', marginBottom: 6 }}>Drop PDF statements here</div>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              or click to browse · multiple files supported · max 10 MB each
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add more PDFs</span>
          </div>
        )}
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {queue.map((item) => (
            <QueueCard
              key={item.id}
              item={item}
              onUpdate={updateItem}
              onRemove={removeItem}
              onUpload={uploadItem}
            />
          ))}
        </div>
      )}

    </div>
  )
}
