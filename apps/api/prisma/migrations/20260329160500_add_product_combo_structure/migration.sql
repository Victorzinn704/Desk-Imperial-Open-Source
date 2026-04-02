-- Add combo metadata to products
ALTER TABLE "Product"
ADD COLUMN "isCombo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "comboDescription" TEXT;

-- Add combo composition table with normalized unit conversion
CREATE TABLE "ProductComboItem" (
  "id" TEXT NOT NULL,
  "comboProductId" TEXT NOT NULL,
  "componentProductId" TEXT NOT NULL,
  "quantityPackages" INTEGER NOT NULL DEFAULT 0,
  "quantityUnits" INTEGER NOT NULL DEFAULT 0,
  "totalUnits" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductComboItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductComboItem_comboProductId_componentProductId_key"
ON "ProductComboItem"("comboProductId", "componentProductId");

CREATE INDEX "ProductComboItem_componentProductId_idx"
ON "ProductComboItem"("componentProductId");

ALTER TABLE "ProductComboItem"
ADD CONSTRAINT "ProductComboItem_comboProductId_fkey"
FOREIGN KEY ("comboProductId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductComboItem"
ADD CONSTRAINT "ProductComboItem_componentProductId_fkey"
FOREIGN KEY ("componentProductId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
