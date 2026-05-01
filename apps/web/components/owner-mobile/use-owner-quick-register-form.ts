import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import {
  ownerQuickRegisterDefaultValues,
  type OwnerQuickRegisterInput,
  ownerQuickRegisterSchema,
  type OwnerQuickRegisterValues,
} from './owner-quick-register-model'

export function useOwnerQuickRegisterForm() {
  const form = useForm<OwnerQuickRegisterInput, undefined, OwnerQuickRegisterValues>({
    resolver: zodResolver(ownerQuickRegisterSchema),
    defaultValues: ownerQuickRegisterDefaultValues,
  })

  const stockBaseUnits = useWatch({ control: form.control, name: 'stockBaseUnits' })
  const unitPrice = useWatch({ control: form.control, name: 'unitPrice' })

  return {
    form,
    stockBaseUnits: Number(stockBaseUnits ?? 0),
    stockValue: Number(stockBaseUnits ?? 0) * Number(unitPrice ?? 0),
  }
}
