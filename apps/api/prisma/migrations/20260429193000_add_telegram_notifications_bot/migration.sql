CREATE TYPE "TelegramAccountStatus" AS ENUM ('ACTIVE', 'REVOKED', 'BLOCKED');

CREATE TABLE "TelegramAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceOwnerUserId" TEXT NOT NULL,
    "telegramChatId" BIGINT NOT NULL,
    "telegramUserId" BIGINT NOT NULL,
    "telegramUsername" TEXT,
    "status" "TelegramAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramLinkToken" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceOwnerUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("token")
);

CREATE INDEX "TelegramAccount_userId_status_idx" ON "TelegramAccount"("userId", "status");
CREATE INDEX "TelegramAccount_workspaceOwnerUserId_status_idx" ON "TelegramAccount"("workspaceOwnerUserId", "status");
CREATE INDEX "TelegramAccount_telegramChatId_status_idx" ON "TelegramAccount"("telegramChatId", "status");
CREATE UNIQUE INDEX "TelegramAccount_telegramChatId_active_key" ON "TelegramAccount"("telegramChatId") WHERE "status" = 'ACTIVE';
CREATE INDEX "TelegramLinkToken_userId_expiresAt_idx" ON "TelegramLinkToken"("userId", "expiresAt");
CREATE INDEX "TelegramLinkToken_workspaceOwnerUserId_expiresAt_idx" ON "TelegramLinkToken"("workspaceOwnerUserId", "expiresAt");
CREATE INDEX "TelegramLinkToken_expiresAt_usedAt_idx" ON "TelegramLinkToken"("expiresAt", "usedAt");

ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_workspaceOwnerUserId_fkey"
FOREIGN KEY ("workspaceOwnerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_workspaceOwnerUserId_fkey"
FOREIGN KEY ("workspaceOwnerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
