'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { comandaToPrintable, type PrintableComanda } from '@/lib/printing'
import type { Comanda, ComandaPayment } from './pdv-types'

const POINT_PAYMENT_NOTE_PREFIX = 'Mercado Pago Point'
const AUTO_PRINT_RECENT_PAYMENT_MS = 10 * 60 * 1000
const AUTO_PRINT_STORAGE_PREFIX = 'desk-imperial.pdv.point-payment-printed.'

type AutoPrintArgs = {
  comandas: Comanda[]
  printComanda: (comanda: PrintableComanda) => Promise<void>
}

export function usePdvAutoPrintTerminalPayments({ comandas, printComanda }: AutoPrintArgs) {
  const attemptedPrints = useRef(new Set<string>())

  useEffect(() => {
    const candidate = findPrintableTerminalPayment(comandas, attemptedPrints.current)
    if (!candidate) {
      return
    }

    attemptedPrints.current.add(candidate.storageKey)
    void printComanda(comandaToPrintable(candidate.comanda))
      .then(() => {
        markTerminalPaymentPrinted(candidate.storageKey)
        toast.success('Comanda paga no Point enviada para a impressora')
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Pagamento aprovado, mas a impressao automatica falhou')
      })
  }, [comandas, printComanda])
}

function findPrintableTerminalPayment(comandas: Comanda[], attemptedPrints: ReadonlySet<string>) {
  for (const comanda of comandas) {
    if (comanda.status !== 'fechada') {
      continue
    }

    const payment = comanda.payments?.find(isRecentUnprintedPointPayment)
    if (!payment) {
      continue
    }

    const storageKey = buildPrintedPaymentStorageKey(payment.id)
    if (!attemptedPrints.has(storageKey) && !wasTerminalPaymentPrinted(storageKey)) {
      return { comanda, payment, storageKey }
    }
  }

  return null
}

function isRecentUnprintedPointPayment(payment: ComandaPayment) {
  return isPointPayment(payment) && Date.now() - payment.paidAt.getTime() <= AUTO_PRINT_RECENT_PAYMENT_MS
}

function isPointPayment(payment: ComandaPayment) {
  return payment.note?.startsWith(POINT_PAYMENT_NOTE_PREFIX) ?? false
}

function buildPrintedPaymentStorageKey(paymentId: string) {
  return `${AUTO_PRINT_STORAGE_PREFIX}${paymentId}`
}

function wasTerminalPaymentPrinted(storageKey: string) {
  return typeof window !== 'undefined' && window.localStorage.getItem(storageKey) === '1'
}

function markTerminalPaymentPrinted(storageKey: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, '1')
  }
}
