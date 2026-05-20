import { BadRequestException, ConflictException } from '@nestjs/common'
import { ComandaPaymentMethod, ComandaPaymentStatus, ComandaStatus, Prisma } from '@prisma/client'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { assertMonetaryAdjustmentsWithinSubtotal, calculateDraftItemsSubtotal } from './comanda-validation.utils'
import { toNumberOrZero } from './operations-domain.utils'
import type { CloseComandaDto, CreateComandaPaymentDto } from './operations.schemas'

type PaymentComanda = {
  payments?: Array<{ amount: Prisma.Decimal | number; status?: string }>
  totalAmount: Prisma.Decimal | number
}

type ClosableComanda = {
  discountAmount: Prisma.Decimal | number
  items: Array<{ totalAmount: Prisma.Decimal | number }>
  serviceFeeAmount: Prisma.Decimal | number
  status: ComandaStatus
}

export type PreparedComandaCloseInput = ReturnType<typeof prepareComandaCloseInput>

type FinalPaymentContext = {
  actorEmployee?: { id: string } | null
  auth: { userId: string }
  workspaceOwnerUserId: string
}

type FinalPaymentComanda = {
  cashSessionId?: string | null
  currentEmployeeId?: string | null
  id: string
}

export function prepareComandaPaymentInput(dto: CreateComandaPaymentDto, comanda: PaymentComanda) {
  const amount = roundCurrency(dto.amount)
  const remainingAmount = roundCurrency(
    Math.max(0, toNumberOrZero(comanda.totalAmount) - calculateConfirmedPaidAmount(comanda)),
  )
  if (amount > remainingAmount) {
    throw new BadRequestException('O pagamento informado passa do saldo restante da comanda.')
  }

  return {
    amount,
    note: sanitizePlainText(dto.note, 'Observacao do pagamento', { allowEmpty: true, rejectFormula: false }),
  }
}

export function prepareComandaCloseInput(dto: CloseComandaDto, comanda: ClosableComanda) {
  assertCanCloseComanda(comanda)
  const discountAmount = roundCurrency(dto.discountAmount ?? toNumberOrZero(comanda.discountAmount))
  const serviceFeeAmount = roundCurrency(dto.serviceFeeAmount ?? toNumberOrZero(comanda.serviceFeeAmount))
  assertMonetaryAdjustmentsWithinSubtotal(calculateDraftItemsSubtotal(comanda.items), discountAmount, serviceFeeAmount)

  return {
    discountAmount,
    notes: sanitizePlainText(dto.notes, 'Observacoes da comanda', { allowEmpty: true, rejectFormula: false }),
    paymentMethod: dto.paymentMethod ?? ComandaPaymentMethod.OTHER,
    serviceFeeAmount,
  }
}

export function calculateConfirmedPaidAmount(comanda: PaymentComanda) {
  return roundCurrency(
    (comanda.payments ?? [])
      .filter((payment) => !payment.status || payment.status === ComandaPaymentStatus.CONFIRMED)
      .reduce((sum, payment) => sum + toNumberOrZero(payment.amount), 0),
  )
}

export async function createFinalComandaPaymentIfNeeded(params: {
  comanda: FinalPaymentComanda
  context: FinalPaymentContext
  paymentMethod: ComandaPaymentMethod
  totalAmount: Prisma.Decimal | number | null
  transaction: Prisma.TransactionClient
}) {
  const confirmedPayments = await params.transaction.comandaPayment.aggregate({
    where: { comandaId: params.comanda.id, status: ComandaPaymentStatus.CONFIRMED },
    _sum: { amount: true },
  })
  const remainingAmount = roundCurrency(
    Math.max(0, toNumberOrZero(params.totalAmount) - toNumberOrZero(confirmedPayments._sum.amount)),
  )
  if (remainingAmount <= 0) {
    return
  }

  await params.transaction.comandaPayment.create({
    data: {
      amount: remainingAmount,
      cashSessionId: params.comanda.cashSessionId ?? null,
      comandaId: params.comanda.id,
      companyOwnerId: params.context.workspaceOwnerUserId,
      createdByUserId: params.context.auth.userId,
      employeeId: params.comanda.currentEmployeeId ?? params.context.actorEmployee?.id ?? null,
      method: params.paymentMethod,
      note: 'Pagamento final da comanda',
    },
  })
}

function assertCanCloseComanda(comanda: Pick<ClosableComanda, 'items' | 'status'>) {
  if (comanda.status === ComandaStatus.CLOSED) {
    throw new ConflictException('Esta comanda ja foi encerrada.')
  }

  if (comanda.status === ComandaStatus.CANCELLED) {
    throw new ConflictException('Comandas canceladas nao podem ser encerradas novamente.')
  }

  if (comanda.items.length === 0) {
    throw new ConflictException('Adicione itens antes de fechar a comanda.')
  }
}
