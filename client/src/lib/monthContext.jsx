import { createContext, useContext, useState } from 'react'

const MonthContext = createContext(null)

function getRecentMonths(count = 3) {
  const months = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'short' }),
    })
  }
  return months
}

export const MONTH_PILLS = [...getRecentMonths(3), { value: 'all', label: 'All' }]

export function MonthProvider({ children }) {
  const [month, setMonth] = useState(MONTH_PILLS[0].value)
  return (
    <MonthContext.Provider value={{ month, setMonth }}>
      {children}
    </MonthContext.Provider>
  )
}

export function useMonth() {
  const ctx = useContext(MonthContext)
  if (!ctx) throw new Error('useMonth must be used inside MonthProvider')
  return ctx
}
