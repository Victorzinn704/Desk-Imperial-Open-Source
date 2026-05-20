-- CreateEnum
CREATE TYPE "PaymentTerminalProvider" AS ENUM ('MERCADO_PAGO_POINT');

-- CreateEnum
CREATE TYPE "PaymentTerminalIntentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "PaymentTerminalIntent" (
    "id" TEXT NOT NULL,
    "companyOwnerId" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "cashSessionId" TEXT,
    "employeeId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "comandaPaymentId" TEXT,
    "provider" "PaymentTerminalProvider" NOT NULL DEFAULT 'MERCADO_PAGO_POINT',
    "status" "PaymentTerminalIntentStatus" NOT NULL DEFAULT 'PENDING',
    "method" "ComandaPaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "providerTerminalId" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "providerStatus" TEXT,
    "externalReference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "expiresAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTerminalIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerminalIntent_comandaPaymentId_key" ON "PaymentTerminalIntent"("comandaPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerminalIntent_externalReference_key" ON "PaymentTerminalIntent"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerminalIntent_idempotencyKey_key" ON "PaymentTerminalIntent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentTerminalIntent_companyOwnerId_status_createdAt_idx" ON "PaymentTerminalIntent"("companyOwnerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentTerminalIntent_comandaId_status_createdAt_idx" ON "PaymentTerminalIntent"("comandaId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentTerminalIntent_cashSessionId_status_createdAt_idx" ON "PaymentTerminalIntent"("cashSessionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentTerminalIntent_provider_providerOrderId_idx" ON "PaymentTerminalIntent"("provider", "providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerminalIntent_comanda_pending_key" ON "PaymentTerminalIntent"("comandaId") WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "PaymentTerminalIntent" ADD CONSTRAINT "PaymentTerminalIntent_companyOwnerId_fkey" FOREIGN KEY ("companyOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTerminalIntent" ADD CONSTRAINT "PaymentTerminalIntent_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTerminalIntent" ADD CONSTRAINT "PaymentTerminalIntent_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTerminalIntent" ADD CONSTRAINT "PaymentTerminalIntent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTerminalIntent" ADD CONSTRAINT "PaymentTerminalIntent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTerminalIntent" ADD CONSTRAINT "PaymentTerminalIntent_comandaPaymentId_fkey" FOREIGN KEY ("comandaPaymentId") REFERENCES "ComandaPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
