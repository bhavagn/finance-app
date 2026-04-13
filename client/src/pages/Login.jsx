import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
)

export default function Login() {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSignIn() {
    setLoading(true)
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success the browser redirects — nothing more to do
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: 360 }}>

        <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.02em', marginBottom: 8 }}>
          FINN/
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 32, textAlign: 'center' }}>
          Your personal finance companion
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '11px 20px', background: '#ffffff', color: '#1A1A1A', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s' }}
        >
          {loading ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="rgba(0,0,0,0.1)" strokeWidth="1.5" />
              <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <GoogleIcon />
          )}
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {error && (
          <p style={{ fontSize: 11, color: 'var(--debit)', margin: '16px 0 0', textAlign: 'center' }}>{error}</p>
        )}

        <p className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
          Only you and people you invite can access this app
        </p>
      </div>
    </div>
  )
}
