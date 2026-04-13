import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

function formatAmount(amount) {
  return Number(amount).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  })
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TransactionsTable({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No transactions found.</p>
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Ref</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t, i) => (
            <TableRow key={i}>
              <TableCell className="whitespace-nowrap">{formatDate(t.date)}</TableCell>
              <TableCell className="max-w-xs truncate" title={t.description}>
                {t.description}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap font-medium">
                {formatAmount(t.amount)}
              </TableCell>
              <TableCell>
                <Badge variant={t.type === 'debit' ? 'destructive' : 'default'}>
                  {t.type}
                </Badge>
              </TableCell>
              <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                {t.balance != null ? formatAmount(t.balance) : '—'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]" title={t.reference_number}>
                {t.reference_number || '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
