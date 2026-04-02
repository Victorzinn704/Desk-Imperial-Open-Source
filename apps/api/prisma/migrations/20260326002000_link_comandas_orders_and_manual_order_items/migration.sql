ALTER TABLE "Order"
ADD COLUMN "comandaId" TEXT;

CREATE UNIQUE INDEX "Order_comandaId_key" ON "Order"("comandaId");

ALTER TABLE "Order"
ADD CONSTRAINT "Order_comandaId_fkey"
FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
ALTER COLUMN "productId" DROP NOT NULL;

ALTER TABLE "OrderItem"
DROP CONSTRAINT "OrderItem_productId_fkey";

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
