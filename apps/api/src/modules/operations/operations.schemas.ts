import {
  cashMovementRecordSchema,
  cashMovementTypeSchema,
  cashSessionRecordSchema,
  comandaRecordSchema,
  comandaStatusSchema,
  mesaRecordSchema,
  operationsClosureSnapshotSchema,
  operationsKitchenResponseSchema,
  operationsLiveResponseSchema,
  operationsSummaryResponseSchema,
} from '@contracts/contracts'
import { z } from 'zod'

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function hasAtMostTwoDecimalPlaces(value: number) {
  return Number.isInteger(value * 100)
}

function coerceOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value === 'string') {
    return Number(value)
  }

  return value
}

function coerceRequiredNumber(value: unknown) {
  if (typeof value === 'string') {
    return Number(value)
  }

  return value
}

function coerceStrictOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') {
      return true
    }
    if (normalized === 'false') {
      return false
    }
  }

  return value
}

function coerceIncludeSnapshot(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value === 'boolean') {
    return value
  }

  return String(value).toLowerCase() !== 'false'
}

function coerceLooseOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return value === true || value === 'true'
}

function createMoneySchema(minValue: number) {
  return z
    .number()
    .finite()
    .min(minValue)
    .refine(hasAtMostTwoDecimalPlaces, 'Use no máximo 2 casas decimais.')
}

function createOptionalMoneySchema(minValue: number) {
  return z.preprocess(coerceOptionalNumber, createMoneySchema(minValue).optional())
}

function createRequiredMoneySchema(minValue: number) {
  return z.preprocess(coerceRequiredNumber, createMoneySchema(minValue))
}

function createOptionalIntegerSchema(minValue: number) {
  return z.preprocess(coerceOptionalNumber, z.number().int().min(minValue).finite().optional())
}

function createRequiredIntegerSchema(minValue: number) {
  return z.preprocess(coerceRequiredNumber, z.number().int().min(minValue).finite())
}

function createTwoDecimalNumberSchema() {
  return z.number().finite().refine(hasAtMostTwoDecimalPlaces, 'Use no máximo 2 casas decimais.')
}

const optionalBusinessDateSchema = z
  .string()
  .regex(BUSINESS_DATE_PATTERN, 'Informe uma data operacional valida no formato YYYY-MM-DD.')
  .optional()

const optionalSnapshotEnvelopeSchema = z
  .object({
    snapshot: operationsLiveResponseSchema.optional(),
  })
  .strict()

const kitchenItemMutationStatusSchema = z.enum(['IN_PREPARATION', 'READY', 'DELIVERED'])

const isoDateTimeStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Informe uma data/hora ISO 8601 valida.')

export const operationsLiveQuerySchema = z
  .object({
    businessDate: optionalBusinessDateSchema,
    includeCashMovements: z.preprocess(coerceStrictOptionalBoolean, z.boolean().optional()),
    compactMode: z.preprocess(coerceStrictOptionalBoolean, z.boolean().optional()),
  })
  .strict()
export type GetOperationsLiveQueryDto = z.infer<typeof operationsLiveQuerySchema>

export const operationsResponseOptionsSchema = z
  .object({
    includeSnapshot: z.preprocess(coerceIncludeSnapshot, z.boolean().optional()),
  })
  .strict()
export type OperationsResponseOptionsDto = z.infer<typeof operationsResponseOptionsSchema>

export const openCashSessionBodySchema = z
  .object({
    openingCashAmount: createRequiredMoneySchema(0),
    businessDate: optionalBusinessDateSchema,
    notes: z.string().max(240).optional(),
  })
  .strict()
export type OpenCashSessionDto = z.infer<typeof openCashSessionBodySchema>

export const createCashMovementBodySchema = z
  .object({
    type: cashMovementTypeSchema,
    amount: createRequiredMoneySchema(0.01),
    note: z.string().max(240).optional(),
  })
  .strict()
export type CreateCashMovementDto = z.infer<typeof createCashMovementBodySchema>

export const closeCashSessionBodySchema = z
  .object({
    countedCashAmount: createRequiredMoneySchema(0),
    notes: z.string().max(240).optional(),
  })
  .strict()
export type CloseCashSessionDto = z.infer<typeof closeCashSessionBodySchema>

export const closeCashClosureBodySchema = z
  .object({
    countedCashAmount: createRequiredMoneySchema(0),
    businessDate: optionalBusinessDateSchema,
    notes: z.string().max(240).optional(),
    forceClose: z.preprocess(coerceLooseOptionalBoolean, z.boolean().optional()),
  })
  .strict()
export type CloseCashClosureDto = z.infer<typeof closeCashClosureBodySchema>

export const comandaDraftItemSchema = z
  .object({
    productId: z.string().optional(),
    productName: z.string().max(120).optional(),
    quantity: createRequiredIntegerSchema(1),
    unitPrice: createOptionalMoneySchema(0),
    notes: z.string().max(200).optional(),
  })
  .strict()
export type ComandaDraftItemDto = z.infer<typeof comandaDraftItemSchema>

export const openComandaBodySchema = z
  .object({
    tableLabel: z.string().max(40),
    customerName: z.string().max(120).optional(),
    customerDocument: z.string().max(32).optional(),
    participantCount: createOptionalIntegerSchema(1),
    notes: z.string().max(240).optional(),
    items: z.array(comandaDraftItemSchema).optional(),
    discountAmount: createOptionalMoneySchema(0),
    serviceFeeAmount: createOptionalMoneySchema(0),
    cashSessionId: z.string().optional(),
    employeeId: z.string().optional(),
    mesaId: z.string().optional(),
  })
  .strict()
export type OpenComandaDto = z.infer<typeof openComandaBodySchema>

export const addComandaItemBodySchema = comandaDraftItemSchema
export type AddComandaItemDto = z.infer<typeof addComandaItemBodySchema>

export const addComandaItemsBatchBodySchema = z
  .object({
    items: z.array(addComandaItemBodySchema).min(1).max(50),
  })
  .strict()
export type AddComandaItemsBatchDto = z.infer<typeof addComandaItemsBatchBodySchema>

export const replaceComandaBodySchema = z
  .object({
    tableLabel: z.string().max(40),
    customerName: z.string().max(120).optional(),
    customerDocument: z.string().max(32).optional(),
    participantCount: createOptionalIntegerSchema(1),
    notes: z.string().max(240).optional(),
    mesaId: z.string().optional(),
    items: z.array(comandaDraftItemSchema),
    discountAmount: createOptionalMoneySchema(0),
    serviceFeeAmount: createOptionalMoneySchema(0),
  })
  .strict()
export type ReplaceComandaDto = z.infer<typeof replaceComandaBodySchema>

export const assignComandaBodySchema = z
  .object({
    employeeId: z.string().optional(),
  })
  .strict()
export type AssignComandaDto = z.infer<typeof assignComandaBodySchema>

export const updateComandaStatusBodySchema = z
  .object({
    status: comandaStatusSchema,
  })
  .strict()
export type UpdateComandaStatusDto = z.infer<typeof updateComandaStatusBodySchema>

export const closeComandaBodySchema = z
  .object({
    discountAmount: createOptionalMoneySchema(0),
    serviceFeeAmount: createOptionalMoneySchema(0),
    notes: z.string().max(240).optional(),
  })
  .strict()
export type CloseComandaDto = z.infer<typeof closeComandaBodySchema>

export const updateKitchenItemStatusBodySchema = z
  .object({
    status: kitchenItemMutationStatusSchema,
  })
  .strict()
export type UpdateKitchenItemStatusDto = z.infer<typeof updateKitchenItemStatusBodySchema>

export const createMesaBodySchema = z
  .object({
    label: z.string().max(40),
    capacity: createOptionalIntegerSchema(1),
    section: z.string().max(60).optional(),
    positionX: createTwoDecimalNumberSchema().optional(),
    positionY: createTwoDecimalNumberSchema().optional(),
  })
  .strict()
export type CreateMesaDto = z.infer<typeof createMesaBodySchema>

export const updateMesaBodySchema = z
  .object({
    label: z.string().max(40).optional(),
    capacity: createOptionalIntegerSchema(1),
    section: z.string().max(60).optional(),
    positionX: createTwoDecimalNumberSchema().optional(),
    positionY: createTwoDecimalNumberSchema().optional(),
    active: z.boolean().optional(),
    reservedUntil: isoDateTimeStringSchema.nullable().optional(),
  })
  .strict()
export type UpdateMesaDto = z.infer<typeof updateMesaBodySchema>

export const comandaDetailsResponseSchema = z
  .object({
    comanda: comandaRecordSchema,
  })
  .strict()

export const cashSessionWithOptionalSnapshotResponseSchema = z
  .object({
    cashSession: cashSessionRecordSchema,
  })
  .extend(optionalSnapshotEnvelopeSchema.shape)
  .strict()

export const cashMovementWithOptionalSnapshotResponseSchema = z
  .object({
    movement: cashMovementRecordSchema,
    cashSession: cashSessionRecordSchema,
  })
  .extend(optionalSnapshotEnvelopeSchema.shape)
  .strict()

export const cashClosureWithOptionalSnapshotResponseSchema = z
  .object({
    closure: operationsClosureSnapshotSchema.nullable(),
  })
  .extend(optionalSnapshotEnvelopeSchema.shape)
  .strict()

export const comandaWithOptionalSnapshotResponseSchema = z
  .object({
    comanda: comandaRecordSchema,
  })
  .extend(optionalSnapshotEnvelopeSchema.shape)
  .strict()

export const kitchenItemStatusUpdateResponseSchema = z
  .object({
    itemId: z.string(),
    status: kitchenItemMutationStatusSchema,
  })
  .strict()

export const mesaResponseSchema = mesaRecordSchema
export const mesasListResponseSchema = z.array(mesaRecordSchema)
export const operationsLiveResponseOpenApiSchema = operationsLiveResponseSchema
export const operationsKitchenResponseOpenApiSchema = operationsKitchenResponseSchema
export const operationsSummaryResponseOpenApiSchema = operationsSummaryResponseSchema
