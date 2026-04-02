-- CreateTable
CREATE TABLE "DemoAccessGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemoAccessGrant_sessionId_key" ON "DemoAccessGrant"("sessionId");

-- CreateIndex
CREATE INDEX "DemoAccessGrant_ipHash_dayKey_idx" ON "DemoAccessGrant"("ipHash", "dayKey");

-- CreateIndex
CREATE INDEX "DemoAccessGrant_userId_dayKey_idx" ON "DemoAccessGrant"("userId", "dayKey");

-- AddForeignKey
ALTER TABLE "DemoAccessGrant" ADD CONSTRAINT "DemoAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoAccessGrant" ADD CONSTRAINT "DemoAccessGrant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
