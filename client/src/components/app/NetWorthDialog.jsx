import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'

const FIELDS = [
  { key: 'mutual_funds', label: 'Mutual Funds', sourceKey: 'mf_source' },
  { key: 'stocks', label: 'Stocks', sourceKey: 'stocks_source' },
  { key: 'gold', label: 'Gold', sourceKey: null },
  { key: 'chit_fund', label: 'Chit Fund', sourceKey: null },
  { key: 'cash', label: 'Cash', sourceKey: null },
  { key: 'epfo', label: 'EPFO', sourceKey: null },
]

function firstOfMonth(yyyymm) {
  return `${yyyymm}-01`
}

function toYYYYMM(yyyymmdd) {
  return yyyymmdd ? yyyymmdd.slice(0, 7) : ''
}

function currentYYYYMM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Last 24 months for the picker
function monthOptions() {
  const opts = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    opts.push({ value, label })
  }
  return opts
}

export default function NetWorthDialog({ open, onOpenChange, snapshot, onSave }) {
  const [month, setMonth] = useState(currentYYYYMM())
  const [values, setValues] = useState({ mutual_funds: '', stocks: '', gold: '', chit_fund: '', cash: '', epfo: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (snapshot) {
      setMonth(toYYYYMM(snapshot.month))
      setValues({
        mutual_funds: snapshot.mutual_funds ?? '',
        stocks: snapshot.stocks ?? '',
        gold: snapshot.gold ?? '',
        chit_fund: snapshot.chit_fund ?? '',
        cash: snapshot.cash ?? '',
        epfo: snapshot.epfo ?? '',
      })
    } else {
      setMonth(currentYYYYMM())
      setValues({ mutual_funds: '', stocks: '', gold: '', chit_fund: '', cash: '', epfo: '' })
    }
    setSaveError(null)
  }, [snapshot, open])

  function set(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(firstOfMonth(month), {
        ...Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === '' ? 0 : Number(v)])),
        mf_source: snapshot?.mf_source || 'manual',
        stocks_source: snapshot?.stocks_source || 'manual',
      })
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const MONTH_OPTS = monthOptions()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{snapshot ? 'Edit Month' : 'Add Month'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Month picker */}
          <div>
            <label className="text-sm font-medium mb-1 block">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              disabled={!!snapshot}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background disabled:opacity-50"
            >
              {MONTH_OPTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Asset fields */}
          <div className="space-y-3">
            {FIELDS.map(({ key, label, sourceKey }) => {
              const isParsed = sourceKey && snapshot?.[sourceKey] === 'parsed'
              return (
                <div key={key} className="flex items-center gap-3">
                  <label className="text-sm w-32 shrink-0 flex items-center gap-1.5">
                    {label}
                    {isParsed && <Badge variant="secondary" className="text-xs px-1 py-0">parsed</Badge>}
                  </label>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={values[key]}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder="0"
                      className="pl-7"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
