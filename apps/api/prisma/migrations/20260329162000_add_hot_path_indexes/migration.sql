CREATE INDEX "Session_userId_createdAt_idx" ON "Session"("userId", "createdAt");

CREATE INDEX "Product_userId_active_createdAt_idx" ON "Product"("userId", "active", "createdAt");

CREATE INDEX "CashSession_companyOwnerId_businessDate_openedAt_idx" ON "CashSession"("companyOwnerId", "businessDate", "openedAt");
