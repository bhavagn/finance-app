import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { monthLabel, INR, ASSET_LABELS } from '../../pages/NetWorth'

const ASSET_COLORS = {
  mutual_funds: '#6366f1',
  stocks: '#8b5cf6',
  gold: '#f59e0b',
  chit_fund: '#10b981',
  cash: '#06b6d4',
  epfo: '#f87171',
}

const LineTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border rounded-md px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{monthLabel(label)}</p>
      <p className="text-muted-foreground">{INR(payload[0].value)}</p>
    </div>
  )
}

const BarTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border rounded-md px-3 py-2 text-sm shadow-md space-y-0.5">
      <p className="font-medium mb-1">{monthLabel(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill }} />
          <span className="text-muted-foreground">{ASSET_LABELS[p.dataKey]}:</span>
          <span>{INR(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function NetWorthCharts({ snapshots }) {
  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base">Net Worth Over Time</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={snapshots} margin={{ top: 8, right: 24, left: 24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
              <Tooltip content={<LineTip />} />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Asset Class Breakdown</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={snapshots} margin={{ top: 8, right: 24, left: 24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
              <Tooltip content={<BarTip />} />
              <Legend formatter={(key) => ASSET_LABELS[key]} wrapperStyle={{ fontSize: 12 }} />
              {Object.keys(ASSET_COLORS).map((key) => (
                <Bar key={key} dataKey={key} stackId="a" fill={ASSET_COLORS[key]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  )
}
