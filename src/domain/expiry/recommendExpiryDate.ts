export const recommendExpiryDate = (ingredientName: string, purchaseDate: string) => {
  const base = new Date(purchaseDate)
  const lower = ingredientName.toLowerCase()

  const dairy = ['milk', 'yogurt', 'cheese', 'butter']
  const meatFish = ['chicken', 'beef', 'pork', 'fish', 'shrimp']
  const vegetables = ['spinach', 'tomato', 'broccoli', 'carrot', 'onion', 'capsicum', 'zucchini', 'eggplant', 'cucumber', 'lettuce', 'cauliflower', 'celery']
  const eggs = ['egg']
  const fruits = ['banana', 'avocado', 'mango', 'lemon']

  let days = 5
  if (dairy.some((x) => lower.includes(x))) days = 7
  if (meatFish.some((x) => lower.includes(x))) days = 3
  if (vegetables.some((x) => lower.includes(x))) days = 5
  if (eggs.some((x) => lower.includes(x))) days = 14
  if (fruits.some((x) => lower.includes(x))) days = 4

  base.setDate(base.getDate() + days)
  return base.toISOString().slice(0, 10)
}
