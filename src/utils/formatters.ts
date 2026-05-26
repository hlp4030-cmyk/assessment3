export const formatDateAU = (isoDate: string) => {
  const date = new Date(isoDate)
  return new Intl.DateTimeFormat('en-AU').format(date)
}

export const formatCurrencyAU = (amount: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount)
