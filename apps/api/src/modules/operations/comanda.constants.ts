import { Prisma } from '@prisma/client'

export const COMANDA_WRITE_ISOLATION_LEVEL = Prisma.TransactionIsolationLevel.Serializable
