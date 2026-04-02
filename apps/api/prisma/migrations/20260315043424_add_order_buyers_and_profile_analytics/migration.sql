-- CreateEnum
CREATE TYPE "BuyerType" AS ENUM ('PERSON', 'COMPANY');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "buyerDocument" TEXT,
ADD COLUMN     "buyerType" "BuyerType";
