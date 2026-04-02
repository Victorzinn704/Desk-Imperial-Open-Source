CREATE TYPE "UserRole" AS ENUM ('OWNER', 'STAFF');

ALTER TABLE "User"
ADD COLUMN "companyOwnerId" TEXT,
ADD COLUMN "companyStreetLine1" TEXT,
ADD COLUMN "companyStreetNumber" TEXT,
ADD COLUMN "companyAddressComplement" TEXT,
ADD COLUMN "companyDistrict" TEXT,
ADD COLUMN "companyCity" TEXT,
ADD COLUMN "companyState" TEXT,
ADD COLUMN "companyPostalCode" TEXT,
ADD COLUMN "companyCountry" TEXT,
ADD COLUMN "companyLatitude" DOUBLE PRECISION,
ADD COLUMN "companyLongitude" DOUBLE PRECISION,
ADD COLUMN "hasEmployees" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "employeeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'OWNER';

ALTER TABLE "Employee"
ADD COLUMN "loginUserId" TEXT;

CREATE UNIQUE INDEX "Employee_loginUserId_key" ON "Employee"("loginUserId");
CREATE INDEX "User_companyOwnerId_role_idx" ON "User"("companyOwnerId", "role");
CREATE INDEX "User_companyCity_companyState_idx" ON "User"("companyCity", "companyState");
CREATE INDEX "User_companyLatitude_companyLongitude_idx" ON "User"("companyLatitude", "companyLongitude");

ALTER TABLE "User"
ADD CONSTRAINT "User_companyOwnerId_fkey"
FOREIGN KEY ("companyOwnerId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "Employee"
ADD CONSTRAINT "Employee_loginUserId_fkey"
FOREIGN KEY ("loginUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
