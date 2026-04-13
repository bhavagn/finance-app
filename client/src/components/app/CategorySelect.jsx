import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { CATEGORIES, PARENT_CATEGORIES } from '@/lib/categories'

// Group subcategories by parent for the dropdown
const GROUPED = PARENT_CATEGORIES.map((parent) => ({
  parent,
  subcategories: CATEGORIES.filter((c) => c.parent === parent).map((c) => c.subcategory),
}))

export default function CategorySelect({ transactionId, currentCategory, onCategoryChange }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleChange(category) {
    setSaving(true)
    setError(null)
    try {
      await api.patch(`/api/transactions/${transactionId}/category`, { category })
      onCategoryChange(category)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Select value={currentCategory || ''} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="w-40 h-8 text-xs">
          <SelectValue placeholder="Uncategorised" />
        </SelectTrigger>
        <SelectContent>
          {GROUPED.map(({ parent, subcategories }) => (
            <SelectGroup key={parent}>
              <SelectLabel className="text-xs">{parent}</SelectLabel>
              {subcategories.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
    </div>
  )
}
