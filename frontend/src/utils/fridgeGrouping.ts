import type { Ingredient } from '../types/models.ts'

export type FridgeGroup = {
  /** Display name (title-cased) */
  name: string
  /** Unit of the earliest-expiring row */
  unit: string
  /** Sum of quantities across all rows in the group */
  totalQuantity: number
  /** The earliest expiry date among all rows */
  earliestExpiryDate: string
  /** All rows belonging to this group, sorted by expiryDate ascending */
  rows: Ingredient[]
}

/**
 * Groups a flat inventory array by ingredient name (case-insensitive).
 *
 * Each group aggregates total quantity and tracks the earliest expiry date.
 * Rows within a group are sorted by expiryDate ascending so that `rows[0]`
 * is always the most urgent item (FIFO ordering).
 */
export const groupByName = (inventory: Ingredient[]): FridgeGroup[] => {
  const map = new Map<string, Ingredient[]>()

  for (const item of inventory) {
    const key = item.name.trim().toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.push(item)
    } else {
      map.set(key, [item])
    }
  }

  const groups: FridgeGroup[] = []

  for (const [, rows] of map) {
    // Sort rows within the group by expiry date ascending (earliest first)
    rows.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())

    const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0)

    groups.push({
      name: rows[0].name,
      unit: rows[0].unit,
      totalQuantity,
      earliestExpiryDate: rows[0].expiryDate,
      rows,
    })
  }

  // Sort groups by earliest expiry date ascending (most urgent first)
  groups.sort((a, b) => new Date(a.earliestExpiryDate).getTime() - new Date(b.earliestExpiryDate).getTime())

  return groups
}