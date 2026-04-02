-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'FORCE_CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('OPENING_FLOAT', 'SUPPLY', 'WITHDRAWAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CashClosureStatus" AS ENUM ('OPEN', 'PENDING_EMPLOYEE_CLOSE', 'CLOSED', 'FORCE_CLOSED');

-- CreateEnum
CREATE TYPE "ComandaStatus" AS ENUM ('OPEN', 'IN_PREPARATION', 'READY', 'CLOSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "percentualVendas" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "salarioBase" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "companyOwnerId" TEXT NOT NULL,
    "employeeId" TEXT,
    "openedByUserId" TEXT NOT NULL,
    "closedByUserId" TEXT,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openingCashAmount" DECIMAL(12,2) NOT NULL,
    "countedCashAmount" DECIMAL(12,2),
    "expectedCashAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "differenceAmount" DECIMAL(12,2),
    "grossRevenueAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "realizedProfitAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "companyOwnerId" TEXT NOT NULL,
    "employeeId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashClosure" (
    "id" TEXT NOT NULL,
    "companyOwnerId" TEXT NOT NULL,
    "closedByUserId" TEXT,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "status" "CashClosureStatus" NOT NULL DEFAULT 'OPEN',
    "expectedCashAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "countedCashAmount" DECIMAL(12,2),
    "differenceAmount" DECIMAL(12,2),
    "grossRevenueAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "realizedProfitAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "openSessionsCount" INTEGER NOT NULL DEFAULT 0,
    "openComandasCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashClosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comanda" (
    "id" TEXT NOT NULL,
    "companyOwnerId" TEXT NOT NULL,
    "cashSessionId" TEXT,
    "openedByUserId" TEXT NOT NULL,
    "closedByUserId" TEXT,
    "currentEmployeeId" TEXT,
    "tableLabel" TEXT NOT NULL,
    "customerName" TEXT,
    "customerDocument" TEXT,
    "participantCount" INTEGER NOT NULL DEFAULT 1,
    "status" "ComandaStatus" NOT NULL DEFAULT 'OPEN',
    "subtotalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "serviceFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComandaItem" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComandaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComandaAssignment" (
    "id" TEXT NOT NULL,
    "companyOwnerId" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComandaAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashSession_companyOwnerId_businessDate_status_idx" ON "CashSession"("companyOwnerId", "businessDate", "status");

-- CreateIndex
CREATE INDEX "CashSession_employeeId_businessDate_idx" ON "CashSession"("employeeId", "businessDate");

-- CreateIndex
CREATE INDEX "CashSession_openedByUserId_businessDate_idx" ON "CashSession"("openedByUserId", "businessDate");

-- CreateIndex
CREATE INDEX "CashMovement_cashSessionId_createdAt_idx" ON "CashMovement"("cashSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "CashMovement_companyOwnerId_createdAt_idx" ON "CashMovement"("companyOwnerId", "createdAt");

-- CreateIndex
CREATE INDEX "CashMovement_employeeId_createdAt_idx" ON "CashMovement"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "CashClosure_companyOwnerId_status_businessDate_idx" ON "CashClosure"("companyOwnerId", "status", "businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "CashClosure_companyOwnerId_businessDate_key" ON "CashClosure"("companyOwnerId", "businessDate");

-- CreateIndex
CREATE INDEX "Comanda_companyOwnerId_status_openedAt_idx" ON "Comanda"("companyOwnerId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "Comanda_currentEmployeeId_status_openedAt_idx" ON "Comanda"("currentEmployeeId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "Comanda_cashSessionId_status_openedAt_idx" ON "Comanda"("cashSessionId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "Comanda_companyOwnerId_tableLabel_openedAt_idx" ON "Comanda"("companyOwnerId", "tableLabel", "openedAt");

-- CreateIndex
CREATE INDEX "ComandaItem_comandaId_createdAt_idx" ON "ComandaItem"("comandaId", "createdAt");

-- CreateIndex
CREATE INDEX "ComandaItem_productId_createdAt_idx" ON "ComandaItem"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ComandaAssignment_companyOwnerId_startedAt_idx" ON "ComandaAssignment"("companyOwnerId", "startedAt");

-- CreateIndex
CREATE INDEX "ComandaAssignment_comandaId_startedAt_idx" ON "ComandaAssignment"("comandaId", "startedAt");

-- CreateIndex
CREATE INDEX "ComandaAssignment_employeeId_startedAt_idx" ON "ComandaAssignment"("employeeId", "startedAt");

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_companyOwnerId_fkey" FOREIGN KEY ("companyOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_companyOwnerId_fkey" FOREIGN KEY ("companyOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashClosure" ADD CONSTRAINT "CashClosure_companyOwnerId_fkey" FOREIGN KEY ("companyOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashClosure" ADD CONSTRAINT "CashClosure_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_companyOwnerId_fkey" FOREIGN KEY ("companyOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_currentEmployeeId_fkey" FOREIGN KEY ("currentEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaItem" ADD CONSTRAINT "ComandaItem_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaItem" ADD CONSTRAINT "ComandaItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaAssignment" ADD CONSTRAINT "ComandaAssignment_companyOwnerId_fkey" FOREIGN KEY ("companyOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaAssignment" ADD CONSTRAINT "ComandaAssignment_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaAssignment" ADD CONSTRAINT "ComandaAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaAssignment" ADD CONSTRAINT "ComandaAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
