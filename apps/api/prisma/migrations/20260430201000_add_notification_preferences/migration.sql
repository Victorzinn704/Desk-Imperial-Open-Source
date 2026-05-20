CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "workspaceOwnerUserId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_workspaceOwnerUserId_channel_eventType_key"
ON "NotificationPreference"("workspaceOwnerUserId", "channel", "eventType");

CREATE INDEX "NotificationPreference_workspaceOwnerUserId_channel_idx"
ON "NotificationPreference"("workspaceOwnerUserId", "channel");

ALTER TABLE "NotificationPreference"
ADD CONSTRAINT "NotificationPreference_workspaceOwnerUserId_fkey"
FOREIGN KEY ("workspaceOwnerUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
