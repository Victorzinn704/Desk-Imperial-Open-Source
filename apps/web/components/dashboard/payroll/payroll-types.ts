import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { EmployeeRecord } from '@/lib/api'

export type PayrollCurrency = FinanceSummaryResponse['displayCurrency'] | 'BRL'

export type PayrollRow = {
  emp: EmployeeRecord
  config: {
    salarioBase: number
    percentualVendas: number
  }
  salarioBaseReais: number
  vendasDoMes: number
  comissao: number
  totalAPagar: number
}
