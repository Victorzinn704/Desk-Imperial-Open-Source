-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('BRL', 'USD', 'EUR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "preferredCurrency" "CurrencyCode" NOT NULL DEFAULT 'BRL';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "currency" "CurrencyCode" NOT NULL DEFAULT 'BRL';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "currency" "CurrencyCode" NOT NULL DEFAULT 'BRL';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "currency" "CurrencyCode" NOT NULL DEFAULT 'BRL';
