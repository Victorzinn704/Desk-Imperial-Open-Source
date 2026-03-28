-- CreateEnum (idempotente para ambientes com aplicação parcial)
DO $$
BEGIN
	CREATE TYPE "KitchenItemStatus" AS ENUM ('QUEUED', 'IN_PREPARATION', 'READY', 'DELIVERED');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END
$$;

-- DropIndex
DROP INDEX IF EXISTS "Comanda_mesaId_idx";

-- AlterTable
ALTER TABLE "ComandaItem" ADD COLUMN IF NOT EXISTS "kitchenQueuedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "kitchenReadyAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "kitchenStatus" "KitchenItemStatus";
