import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Upload from './pages/Upload'
import Uploads from './pages/Uploads'
import Transactions from './pages/Transactions'
import Dashboard from './pages/Dashboard'
import NetWorth from './pages/NetWorth'
import Nav from './components/app/Nav'
import { useTheme } from './hooks/useTheme'

function AppShell() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState('overview')
  useTheme()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.04em', color: 'var(--gold)', opacity: 0.4 }}>
          FINN/
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <div className="min-h-screen bg-background">
      <Nav tab={tab} setTab={setTab} />
      {tab === 'overview' && <Dashboard onNavigate={setTab} />}
      {tab === 'transactions' && <Transactions />}
      <div style={{ display: tab === 'upload' ? 'block' : 'none' }}><Upload /></div>
      {tab === 'history' && <Uploads />}
      {tab === 'networth' && <NetWorth />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
