-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "requiresKitchen" BOOLEAN NOT NULL DEFAULT false;
