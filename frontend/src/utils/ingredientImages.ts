/**
 * Centralised image helpers for ingredients and recipes.
 * Provides robust fallback to curated Unsplash photos when DB image_url is absent or broken.
 */

const UNSPLASH_INGREDIENT: Record<string, string> = {
  // Vegetables
  broccoli: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=200&q=80',
  cauliflower: 'https://images.unsplash.com/photo-1568702846914-96b305d2uj58?auto=format&fit=crop&w=200&q=80',
  carrot: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=200&q=80',
  tomato: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?auto=format&fit=crop&w=200&q=80',
  tomatoes: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?auto=format&fit=crop&w=200&q=80',
  spinach: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=200&q=80',
  onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=200&q=80',
  garlic: 'https://images.unsplash.com/photo-1615477550927-6ec8445b9b4f?auto=format&fit=crop&w=200&q=80',
  capsicum: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=200&q=80',
  mushroom: 'https://images.unsplash.com/photo-1552825897-bb22e04e4b4c?auto=format&fit=crop&w=200&q=80',
  zucchini: 'https://images.unsplash.com/photo-1587411768515-eeac0647deed?auto=format&fit=crop&w=200&q=80',
  eggplant: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=200&q=80',
  potato: 'https://images.unsplash.com/photo-1518977676601-b53f82ber4a?auto=format&fit=crop&w=200&q=80',
  'sweet potato': 'https://images.unsplash.com/photo-1596097611384-d7e6be9dbc34?auto=format&fit=crop&w=200&q=80',
  lettuce: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=200&q=80',
  cucumber: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=200&q=80',
  corn: 'https://images.unsplash.com/photo-1551779074-57c07d3b1a98?auto=format&fit=crop&w=200&q=80',
  peas: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&w=200&q=80',
  beans: 'https://images.unsplash.com/photo-1564894809611-1742fc40ed80?auto=format&fit=crop&w=200&q=80',
  chickpeas: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=200&q=80',
  // Fruits
  lemon: 'https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=200&q=80',
  banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=200&q=80',
  basil: 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?auto=format&fit=crop&w=200&q=80',
  parsley: 'https://images.unsplash.com/photo-1600231915619-eb5c0bd1be5b?auto=format&fit=crop&w=200&q=80',
  avocado: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=200&q=80',
  mango: 'https://images.unsplash.com/photo-1553279768-61481d08db32?auto=format&fit=crop&w=200&q=80',
  // Meat
  chicken: 'https://images.unsplash.com/photo-1604503449996-04a7f34ef624?auto=format&fit=crop&w=200&q=80',
  beef: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=200&q=80',
  pork: 'https://images.unsplash.com/photo-1602473812149-2e5e3f6f3a2a?auto=format&fit=crop&w=200&q=80',
  tofu: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80',
  // Seafood
  fish: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=200&q=80',
  shrimp: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=200&q=80',
  // Dairy
  milk: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=200&q=80',
  eggs: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=200&q=80',
  yogurt: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=200&q=80',
  cheese: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=200&q=80',
  butter: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=200&q=80',
  // Grains
  rice: 'https://images.unsplash.com/photo-1536304993881-460e2e8e1dcd?auto=format&fit=crop&w=200&q=80',
  pasta: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=200&q=80',
  oats: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=200&q=80',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=80',
  celery: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?auto=format&fit=crop&w=200&q=80',
  'olive oil': 'https://images.unsplash.com/photo-1474979266404-7f28bc5e5a1b?auto=format&fit=crop&w=200&q=80',
}

const UNSPLASH_RECIPE: Record<string, string> = {
  omelette: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=600&q=80',
  egg: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=600&q=80',
  toast: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
  oats: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=600&q=80',
  yogurt: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
  chicken: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  steak: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
  beef: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
  pasta: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=600&q=80',
  rice: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
  salad: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=600&q=80',
  fish: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
  shrimp: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
  soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
  potato: 'https://images.unsplash.com/photo-1603046891744-73f165aa69e0?auto=format&fit=crop&w=600&q=80',
  sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  wrap: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
  stir: 'https://images.unsplash.com/photo-1604908176997-431f6a5f08a9?auto=format&fit=crop&w=600&q=80',
  mushroom: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
  broccoli: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=600&q=80',
  tofu: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  bowl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
  cauliflower: 'https://images.unsplash.com/photo-1568702846914-96b305d2uj58?auto=format&fit=crop&w=600&q=80',
  eggplant: 'https://images.unsplash.com/photo-1604908554027-4b4ecf7dbb3a?auto=format&fit=crop&w=600&q=80',
  pork: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
  zucchini: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=600&q=80',
  avocado: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=600&q=80',
  banana: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
  lemon: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
}

const CATEGORY_EMOJI: Record<string, string> = {
  vegetables: '🥦',
  fruits: '🍎',
  meat: '🥩',
  seafood: '🐟',
  dairy: '🥛',
  grains: '🌾',
}

/** Returns a valid image URL for an ingredient, with Unsplash fallback and emoji as last resort. */
export function getIngredientImageUrl(name: string, dbUrl?: string | null): string {
  if (dbUrl && dbUrl.trim()) return dbUrl
  const key = name.trim().toLowerCase()
  return UNSPLASH_INGREDIENT[key] ?? ''
}

/** Returns category emoji for a given category string. */
export function getIngredientEmoji(category?: string): string {
  return CATEGORY_EMOJI[category?.toLowerCase() ?? ''] ?? '🥗'
}

/** Returns a recipe image URL: DB URL first, then keyword-matched Unsplash fallback. */
export function getRecipeImageUrl(title: string, dbUrl?: string | null): string {
  if (dbUrl && dbUrl.trim()) return dbUrl
  const lower = title.toLowerCase()
  for (const [keyword, url] of Object.entries(UNSPLASH_RECIPE)) {
    if (lower.includes(keyword)) return url
  }
  // Ultimate fallback — a generic food photo
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
}