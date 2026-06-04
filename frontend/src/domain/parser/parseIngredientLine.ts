import type { Ingredient } from '../../types/models.ts'

const UNIT_REGEX = /(kg|g|l|ml|pcs|pack|ea)/i

/** Normalise legacy / variant units to the 3 MVP standard units. */
const normaliseUnit = (raw: string, quantity: number): { unit: string; quantity: number } => {
  const u = raw.toLowerCase()
  if (u === 'kg') return { unit: 'g', quantity: quantity * 1000 }
  if (u === 'l') return { unit: 'ml', quantity: quantity * 1000 }
  if (u === 'pcs' || u === 'pack') return { unit: 'ea', quantity }
  if (u === 'ea' || u === 'g' || u === 'ml') return { unit: u, quantity }
  return { unit: 'ea', quantity }
}

export const parseIngredientLine = (line: string): Ingredient[] => {
  const today = new Date().toISOString().slice(0, 10)
  return line
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, index) => {
      const compactMatch = chunk.match(/^(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pcs|pack|ea)?\s*(.*)$/i)
      const rawQuantity = compactMatch ? Number(compactMatch[1]) || 1 : 1
      const rawUnit = (compactMatch?.[2] ?? chunk.match(UNIT_REGEX)?.[0] ?? 'pcs').toLowerCase()
      const { unit, quantity } = normaliseUnit(rawUnit, rawQuantity)
      const name = chunk
        .replace(/^\d+(\.\d+)?\s*(kg|g|l|ml|pcs|pack|ea)?\s*/i, '')
        .replace(UNIT_REGEX, '')
        .trim()
      return {
        id: `${Date.now()}-${index}`,
        name: name || 'Unknown ingredient',
        icon: '🥬',
        quantity,
        unit,
        category: 'General',
        purchaseDate: today,
        expiryDate: today,
        source: 'single-line',
      }
    })
}
