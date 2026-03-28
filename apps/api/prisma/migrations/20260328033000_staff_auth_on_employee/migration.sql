ALTER TABLE "Employee"
ADD COLUMN "passwordHash" TEXT;

UPDATE "Employee"
SET "passwordHash" = "User"."passwordHash"
FROM "User"
WHERE "Employee"."loginUserId" = "User"."id"
  AND "Employee"."passwordHash" IS NULL;

ALTER TABLE "Session"
ADD COLUMN "employeeId" TEXT,
ADD COLUMN "workspaceOwnerUserId" TEXT;

UPDATE "Session"
SET "workspaceOwnerUserId" = COALESCE(
  (SELECT "companyOwnerId" FROM "User" WHERE "User"."id" = "Session"."userId"),
  "userId"
);

ALTER TABLE "Session"
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "workspaceOwnerUserId" SET NOT NULL;

CREATE INDEX "Session_employeeId_expiresAt_idx" ON "Session"("employeeId", "expiresAt");
CREATE INDEX "Session_workspaceOwnerUserId_expiresAt_idx" ON "Session"("workspaceOwnerUserId", "expiresAt");

ALTER TABLE "Session"
ADD CONSTRAINT "Session_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Session"
ADD CONSTRAINT "Session_workspaceOwnerUserId_fkey" FOREIGN KEY ("workspaceOwnerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
