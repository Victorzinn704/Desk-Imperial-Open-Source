-- CreateEnum
CREATE TYPE "ComandaPaymentMethod" AS ENUM ('CASH', 'PIX', 'DEBIT', 'CREDIT', 'VOUCHER', 'OTHER');

-- CreateEnum
CREATE TYPE "ComandaPaymentStatus" AS ENUM ('CONFIRMED', 'VOIDED');

-- CreateTable
CREATE TABLE "ComandaPayment" (
    "id" TEXT NOT NULL,
    "companyOwnerId" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "cashSessionId" TEXT,
    "employeeId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "method" "ComandaPaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "status" "ComandaPaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComandaPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComandaPayment_companyOwnerId_paidAt_idx" ON "ComandaPayment"("companyOwnerId", "paidAt");

-- CreateIndex
CREATE INDEX "ComandaPayment_comandaId_paidAt_idx" ON "ComandaPayment"("comandaId", "paidAt");

-- CreateIndex
CREATE INDEX "ComandaPayment_cashSessionId_paidAt_idx" ON "ComandaPayment"("cashSessionId", "paidAt");

-- CreateIndex
CREATE INDEX "ComandaPayment_employeeId_paidAt_idx" ON "ComandaPayment"("employeeId", "paidAt");

-- CreateIndex
CREATE INDEX "ComandaPayment_companyOwnerId_status_paidAt_idx" ON "ComandaPayment"("companyOwnerId", "status", "paidAt");

-- AddForeignKey
ALTER TABLE "ComandaPayment" ADD CONSTRAINT "ComandaPayment_companyOwnerId_fkey" FOREIGN KEY ("companyOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaPayment" ADD CONSTRAINT "ComandaPayment_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaPayment" ADD CONSTRAINT "ComandaPayment_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaPayment" ADD CONSTRAINT "ComandaPayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaPayment" ADD CONSTRAINT "ComandaPayment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
