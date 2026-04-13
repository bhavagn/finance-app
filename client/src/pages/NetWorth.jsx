import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import NetWorthCharts from '../components/app/NetWorthCharts'
import NetWorthDialog from '../components/app/NetWorthDialog'
import { api } from '../lib/api'

export const INR = (v) =>
  Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function monthLabel(yyyymmdd) {
  const [y, m] = yyyymmdd.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}

const ASSET_KEYS = ['mutual_funds', 'stocks', 'gold', 'chit_fund', 'cash', 'epfo']
export const ASSET_LABELS = {
  mutual_funds: 'Mutual Funds',
  stocks: 'Stocks',
  gold: 'Gold',
  chit_fund: 'Chit Fund',
  cash: 'Cash',
  epfo: 'EPFO',
}

function largestAsset(snapshot) {
  if (!snapshot) return null
  let max = 0; let label = null
  for (const key of ASSET_KEYS) {
    if (snapshot[key] > max) { max = snapshot[key]; label = ASSET_LABELS[key] }
  }
  return label ? { label, value: max } : null
}

function momChange(snapshots) {
  if (!snapshots || snapshots.length < 2) return null
  return snapshots[snapshots.length - 1].total - snapshots[snapshots.length - 2].total
}

export default function NetWorth() {
  const [snapshots, setSnapshots] = useState([])
  const [latest, setLatest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editSnapshot, setEditSnapshot] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [snapshots, latest] = await Promise.all([
        api.get('/networth'),
        api.get('/networth/latest'),
      ])
      setSnapshots(snapshots || [])
      setLatest(latest)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openAdd() { setEditSnapshot(null); setDialogOpen(true) }
  function openEdit(s) { setEditSnapshot(s); setDialogOpen(true) }

  async function handleSave(month, values) {
    await api.post(`/networth/${month}`, values)
    setDialogOpen(false)
    load()
  }

  const top = largestAsset(latest)
  const change = momChange(snapshots)

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Net Worth</h1>
        <Button onClick={openAdd} size="sm">Add / Edit Month</Button>
      </div>

      {error && <p className="text-sm text-destructive">Error: {error}</p>}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{loading || !latest ? '—' : INR(latest.total)}</p>
            {latest && <p className="text-xs text-muted-foreground mt-1">{monthLabel(latest.month)}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Largest Asset</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{loading || !top ? '—' : top.label}</p>
            {top && <p className="text-sm text-muted-foreground mt-1">{INR(top.value)}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MoM Change</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || change === null ? (
              <p className="text-2xl font-semibold">—</p>
            ) : (
              <p className={`text-2xl font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {change >= 0 ? '+' : ''}{INR(change)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {!loading && snapshots.length > 0 && <NetWorthCharts snapshots={snapshots} />}
      {!loading && snapshots.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No data yet. Add your first month to get started.
          </CardContent>
        </Card>
      )}

      {/* History table */}
      {!loading && snapshots.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Month</th>
                  <th className="text-right px-4 py-2 font-medium">MF</th>
                  <th className="text-right px-4 py-2 font-medium">Stocks</th>
                  <th className="text-right px-4 py-2 font-medium">Gold</th>
                  <th className="text-right px-4 py-2 font-medium">Chit Fund</th>
                  <th className="text-right px-4 py-2 font-medium">Cash</th>
                  <th className="text-right px-4 py-2 font-medium">EPFO</th>
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {[...snapshots].reverse().map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2 font-medium">
                      <div>{monthLabel(s.month)}</div>
                      <div className="flex gap-1 mt-0.5">
                        {s.mf_source === 'parsed' && <Badge variant="secondary" className="text-xs px-1 py-0">MF parsed</Badge>}
                        {s.stocks_source === 'parsed' && <Badge variant="secondary" className="text-xs px-1 py-0">stocks parsed</Badge>}
                      </div>
                    </td>
                    <td className="text-right px-4 py-2 text-muted-foreground">{INR(s.mutual_funds)}</td>
                    <td className="text-right px-4 py-2 text-muted-foreground">{INR(s.stocks)}</td>
                    <td className="text-right px-4 py-2 text-muted-foreground">{INR(s.gold)}</td>
                    <td className="text-right px-4 py-2 text-muted-foreground">{INR(s.chit_fund)}</td>
                    <td className="text-right px-4 py-2 text-muted-foreground">{INR(s.cash)}</td>
                    <td className="text-right px-4 py-2 text-muted-foreground">{INR(s.epfo)}</td>
                    <td className="text-right px-4 py-2 font-semibold">{INR(s.total)}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => openEdit(s)} className="text-xs text-muted-foreground hover:text-foreground underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <NetWorthDialog open={dialogOpen} onOpenChange={setDialogOpen} snapshot={editSnapshot} onSave={handleSave} />
    </div>
  )
}
