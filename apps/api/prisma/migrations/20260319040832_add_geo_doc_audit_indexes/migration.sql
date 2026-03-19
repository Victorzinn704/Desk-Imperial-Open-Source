-- CreateIndex
CREATE INDEX "AuditLog_resourceId_event_idx" ON "AuditLog"("resourceId", "event");

-- CreateIndex
CREATE INDEX "Order_userId_currency_createdAt_idx" ON "Order"("userId", "currency", "createdAt");

-- CreateIndex
CREATE INDEX "Order_buyerCity_buyerState_idx" ON "Order"("buyerCity", "buyerState");

-- CreateIndex
CREATE INDEX "Order_buyerDocument_idx" ON "Order"("buyerDocument");

-- CreateIndex
CREATE INDEX "Product_userId_category_idx" ON "Product"("userId", "category");

-- CreateIndex
CREATE INDEX "Product_userId_currency_createdAt_idx" ON "Product"("userId", "currency", "createdAt");
