import { formatCurrency } from '@/lib/currency'

export function formatPortfolioMoney({
  amount,
  currency,
}: Readonly<{
  amount: number
  currency: string
}>) {
  return formatCurrency(amount, currency as never)
}
