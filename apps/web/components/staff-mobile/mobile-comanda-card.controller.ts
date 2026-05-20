'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { calcSubtotal, calcTotal, formatElapsed } from '@/components/pdv/pdv-types'
import { toPdvComanda } from '@/components/pdv/pdv-operations'
import { fetchComandaDetails } from '@/lib/api'
import {
  clampPercent,
  formatPaymentInput,
  PAYMENT_METHOD_OPTIONS,
  resolveMobileComandaStatusConfig,
} from './mobile-comanda-list.helpers'
import type { MobileComandaCardProps, PaymentMethod } from './mobile-comanda-list.types'

export function useMobileComandaCardController({
  comanda,
  currentEmployeeId = null,
  isFocused,
  onCreatePayment,
}: Pick<MobileComandaCardProps, 'comanda' | 'currentEmployeeId' | 'isFocused' | 'onCreatePayment'>) {
  const [discountPercent, setDiscountPercent] = useState(() => comanda.desconto ?? 0)
  const [surchargePercent, setSurchargePercent] = useState(() => comanda.acrescimo ?? 0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')
  const [paymentAmount, setPaymentAmount] = useState('')
  const { data: detailsData, isLoading: isLoadingDetails } = useMobileComandaDetails(comanda.id, isFocused)
  const activeComanda = detailsData ?? comanda
  const derived = useMobileComandaDerivedState({
    activeComanda,
    comanda,
    currentEmployeeId,
    discountPercent,
    onCreatePayment,
    paymentAmount,
    surchargePercent,
  })

  return {
    activeComanda,
    ...derived,
    discountPercent,
    isLoadingDetails,
    paymentAmount,
    paymentMethod,
    setDiscountPercent: (value: number) => setDiscountPercent(clampPercent(value)),
    setPaymentAmount,
    setPaymentMethod,
    setPaymentShortcut: (amount: number) => setPaymentAmount(formatPaymentInput(amount)),
    setSurchargePercent: (value: number) => setSurchargePercent(clampPercent(value)),
    surchargePercent,
  }
}

function useMobileComandaDetails(comandaId: string, isFocused: boolean) {
  return useQuery({
    queryKey: ['comanda-details', comandaId],
    queryFn: async () => {
      const res = await fetchComandaDetails(comandaId)
      return toPdvComanda(res.comanda)
    },
    enabled: isFocused,
    staleTime: 5000,
  })
}

// eslint-disable-next-line max-lines-per-function
function useMobileComandaDerivedState({
  activeComanda,
  comanda,
  currentEmployeeId,
  discountPercent,
  onCreatePayment,
  paymentAmount,
  surchargePercent,
}: Readonly<{
  activeComanda: MobileComandaCardProps['comanda']
  comanda: MobileComandaCardProps['comanda']
  currentEmployeeId: string | null
  discountPercent: number
  onCreatePayment: MobileComandaCardProps['onCreatePayment']
  paymentAmount: string
  surchargePercent: number
}>) {
  const config = resolveMobileComandaStatusConfig(activeComanda.status)
  const total = useMemo(() => calcTotal(activeComanda), [activeComanda])
  const subtotal = useMemo(() => calcSubtotal(activeComanda), [activeComanda])
  const elapsed = useMemo(() => formatElapsed(activeComanda.abertaEm), [activeComanda.abertaEm])
  const itemCount = useMemo(
    () => activeComanda.itens.reduce((sum, item) => sum + item.quantidade, 0),
    [activeComanda.itens],
  )
  const adjustedTotal = useMemo(
    () => subtotal * (1 - discountPercent / 100) * (1 + surchargePercent / 100),
    [discountPercent, subtotal, surchargePercent],
  )
  const paidAmount = activeComanda.paidAmount ?? 0
  const remainingAmount = Math.max(0, activeComanda.remainingAmount ?? adjustedTotal - paidAmount)
  const parsedPaymentAmount = Number(paymentAmount.replace(',', '.'))

  return {
    adjustedTotal,
    canAddItems: activeComanda.status === 'aberta' || activeComanda.status === 'em_preparo',
    canCreatePayment:
      Boolean(onCreatePayment) &&
      Number.isFinite(parsedPaymentAmount) &&
      parsedPaymentAmount > 0 &&
      parsedPaymentAmount <= remainingAmount + 0.009,
    config,
    elapsed,
    isOwnedByCurrentEmployee: Boolean(currentEmployeeId && comanda.garcomId === currentEmployeeId),
    itemCount,
    paidAmount,
    parsedPaymentAmount,
    paymentMethods: PAYMENT_METHOD_OPTIONS,
    primaryWaiterName: comanda.garcomNome ?? null,
    remainingAmount,
    showDirectClose: activeComanda.status === 'aberta' || activeComanda.status === 'em_preparo',
    subtotal,
    total,
  }
}
