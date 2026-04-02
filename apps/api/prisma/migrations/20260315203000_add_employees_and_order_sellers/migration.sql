CREATE TABLE "Employee" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "employeeCode" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order"
ADD COLUMN "buyerDistrict" TEXT,
ADD COLUMN "employeeId" TEXT,
ADD COLUMN "sellerCode" TEXT,
ADD COLUMN "sellerName" TEXT;

CREATE INDEX "Employee_userId_active_idx" ON "Employee"("userId", "active");
CREATE UNIQUE INDEX "Employee_userId_employeeCode_key" ON "Employee"("userId", "employeeCode");
CREATE INDEX "Order_employeeId_createdAt_idx" ON "Order"("employeeId", "createdAt");

ALTER TABLE "Employee"
ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
