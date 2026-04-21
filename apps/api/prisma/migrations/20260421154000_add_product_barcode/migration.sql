-- Add optional barcode/EAN support to products
ALTER TABLE "Product"
ADD COLUMN "barcode" TEXT;

-- Prevent duplicate barcode inside the same workspace while allowing many NULLs
CREATE UNIQUE INDEX "Product_userId_barcode_key" ON "Product"("userId", "barcode");
