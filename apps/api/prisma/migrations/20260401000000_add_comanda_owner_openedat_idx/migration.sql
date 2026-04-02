-- Single-column composite index to support the unified comanda query in
-- buildLiveSnapshot: WHERE companyOwnerId = ? AND openedAt BETWEEN ? AND ?
-- Previously the function used two sequential waves; now it queries all
-- comandas for the business date window in parallel with the other four queries.
CREATE INDEX IF NOT EXISTS "Comanda_companyOwnerId_openedAt_idx"
ON "Comanda" ("companyOwnerId", "openedAt");
