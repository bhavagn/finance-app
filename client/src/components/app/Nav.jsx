import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../contexts/AuthContext'
import { Sun, Moon } from 'lucide-react'

const GOLD = '#C9A84C'

const TABS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="8" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="1" y="8" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="8" y="8" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <line x1="1" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="1" y1="7.5" x2="10" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="1" y1="11" x2="7" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'upload',
    label: 'Upload',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 10V3M4 6l3-3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'networth',
    label: 'Net Worth',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <polyline points="1,11 4,8 7,9 10,5 13,3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const avatarUrl = user?.user_metadata?.avatar_url
  const email = user?.email ?? ''
  const initial = email[0]?.toUpperCase() ?? '?'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', border: `0.5px solid ${open ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.12)'}`, cursor: 'pointer', background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'border-color 0.15s' }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
        ) : (
          <span style={{ fontSize: 10, fontWeight: 600, color: GOLD }}>{initial}</span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 8, minWidth: 180, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px 8px', borderBottom: '0.5px solid var(--border)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email}
          </div>
          <button
            onClick={() => { setOpen(false); signOut() }}
            style={{ width: '100%', textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--debit)'; e.currentTarget.style.background = 'rgba(224,123,106,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'none' }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Nav({ tab, setTab }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <nav style={{ background: '#080A0E', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-6xl mx-auto px-6 flex items-center h-11 gap-6">
        {/* Wordmark */}
        <span className="font-mono text-sm shrink-0 select-none" style={{ color: GOLD, letterSpacing: '0.02em' }}>
          FINN/
        </span>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 h-full">
          {TABS.map((t) => {
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 h-full text-[12px] border-b-2 transition-colors duration-150"
                style={{
                  fontFamily: 'var(--font-sans)',
                  color: isActive ? 'var(--text-primary)' : 'rgba(226,221,214,0.35)',
                  borderBottomColor: isActive ? GOLD : 'transparent',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'rgba(226,221,214,0.65)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'rgba(226,221,214,0.35)' }}
              >
                {t.icon}
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="shrink-0 p-1.5 rounded transition-colors duration-150"
          style={{ color: 'rgba(226,221,214,0.35)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(226,221,214,0.65)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(226,221,214,0.35)' }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* User avatar + dropdown */}
        <UserMenu />
      </div>
    </nav>
  )
}
