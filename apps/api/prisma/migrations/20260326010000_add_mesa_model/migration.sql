-- CreateTable
CREATE TABLE "Mesa" (
    "id" TEXT NOT NULL,
    "companyOwnerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "section" TEXT,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reservedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mesa_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Mesa" ADD CONSTRAINT "Mesa_companyOwnerId_fkey"
    FOREIGN KEY ("companyOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateUniqueIndex
CREATE UNIQUE INDEX "Mesa_companyOwnerId_label_key" ON "Mesa"("companyOwnerId", "label");

-- CreateIndex
CREATE INDEX "Mesa_companyOwnerId_active_idx" ON "Mesa"("companyOwnerId", "active");

-- AlterTable Comanda: add mesaId FK
ALTER TABLE "Comanda" ADD COLUMN "mesaId" TEXT;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_mesaId_fkey"
    FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Comanda_mesaId_idx" ON "Comanda"("mesaId");
