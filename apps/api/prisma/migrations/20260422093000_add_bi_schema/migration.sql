CREATE SCHEMA IF NOT EXISTS bi;

CREATE MATERIALIZED VIEW bi.sales_daily AS
SELECT
  o."userId" AS company_owner_id,
  DATE(o."createdAt") AS business_date,
  COUNT(*) FILTER (WHERE o.status = 'COMPLETED') AS completed_orders_count,
  COUNT(*) FILTER (WHERE o.status = 'CANCELLED') AS cancelled_orders_count,
  COALESCE(SUM(o."totalItems") FILTER (WHERE o.status = 'COMPLETED'), 0)::bigint AS items_count,
  COALESCE(SUM(o."totalRevenue") FILTER (WHERE o.status = 'COMPLETED'), 0)::numeric(14, 2) AS revenue_amount,
  COALESCE(SUM(o."totalCost") FILTER (WHERE o.status = 'COMPLETED'), 0)::numeric(14, 2) AS cost_amount,
  COALESCE(SUM(o."totalProfit") FILTER (WHERE o.status = 'COMPLETED'), 0)::numeric(14, 2) AS profit_amount,
  COALESCE(AVG(o."totalRevenue") FILTER (WHERE o.status = 'COMPLETED'), 0)::numeric(14, 2) AS avg_ticket_amount
FROM public."Order" o
GROUP BY o."userId", DATE(o."createdAt");

CREATE INDEX bi_sales_daily_owner_date_idx ON bi.sales_daily (company_owner_id, business_date);

CREATE MATERIALIZED VIEW bi.sales_by_channel_daily AS
SELECT
  o."userId" AS company_owner_id,
  DATE(o."createdAt") AS business_date,
  COALESCE(NULLIF(TRIM(o.channel), ''), 'Sem canal') AS channel,
  COUNT(*) FILTER (WHERE o.status = 'COMPLETED') AS completed_orders_count,
  COUNT(*) FILTER (WHERE o.status = 'CANCELLED') AS cancelled_orders_count,
  COALESCE(SUM(o."totalRevenue") FILTER (WHERE o.status = 'COMPLETED'), 0)::numeric(14, 2) AS revenue_amount,
  COALESCE(SUM(o."totalCost") FILTER (WHERE o.status = 'COMPLETED'), 0)::numeric(14, 2) AS cost_amount,
  COALESCE(SUM(o."totalProfit") FILTER (WHERE o.status = 'COMPLETED'), 0)::numeric(14, 2) AS profit_amount,
  COALESCE(SUM(o."totalItems") FILTER (WHERE o.status = 'COMPLETED'), 0)::bigint AS items_count
FROM public."Order" o
GROUP BY o."userId", DATE(o."createdAt"), COALESCE(NULLIF(TRIM(o.channel), ''), 'Sem canal');

CREATE INDEX bi_sales_by_channel_owner_date_idx ON bi.sales_by_channel_daily (company_owner_id, business_date, channel);

CREATE VIEW bi.margin_daily AS
SELECT
  sd.company_owner_id,
  sd.business_date,
  sd.revenue_amount,
  sd.cost_amount,
  sd.profit_amount,
  CASE
    WHEN sd.revenue_amount = 0 THEN 0::numeric(8, 4)
    ELSE ROUND(sd.profit_amount / NULLIF(sd.revenue_amount, 0), 4)
  END AS margin_ratio
FROM bi.sales_daily sd;

CREATE MATERIALIZED VIEW bi.products_performance_daily AS
SELECT
  o."userId" AS company_owner_id,
  DATE(o."createdAt") AS business_date,
  oi."productId" AS product_id,
  COALESCE(p.name, oi."productName") AS product_name,
  COALESCE(NULLIF(TRIM(p.brand), ''), 'Sem marca') AS brand,
  COALESCE(NULLIF(TRIM(oi.category), ''), COALESCE(p.category, 'Sem categoria')) AS category,
  COALESCE(SUM(oi.quantity), 0)::bigint AS units_sold,
  COALESCE(SUM(oi."lineRevenue"), 0)::numeric(14, 2) AS revenue_amount,
  COALESCE(SUM(oi."lineCost"), 0)::numeric(14, 2) AS cost_amount,
  COALESCE(SUM(oi."lineProfit"), 0)::numeric(14, 2) AS profit_amount,
  COALESCE(AVG(oi."unitPrice"), 0)::numeric(14, 2) AS avg_unit_price
FROM public."OrderItem" oi
INNER JOIN public."Order" o ON o.id = oi."orderId"
LEFT JOIN public."Product" p ON p.id = oi."productId"
WHERE o.status = 'COMPLETED'
GROUP BY
  o."userId",
  DATE(o."createdAt"),
  oi."productId",
  COALESCE(p.name, oi."productName"),
  COALESCE(NULLIF(TRIM(p.brand), ''), 'Sem marca'),
  COALESCE(NULLIF(TRIM(oi.category), ''), COALESCE(p.category, 'Sem categoria'));

CREATE INDEX bi_products_perf_owner_date_idx ON bi.products_performance_daily (company_owner_id, business_date);
CREATE INDEX bi_products_perf_owner_category_idx ON bi.products_performance_daily (company_owner_id, category);

CREATE MATERIALIZED VIEW bi.category_performance_daily AS
SELECT
  company_owner_id,
  business_date,
  category,
  SUM(units_sold)::bigint AS units_sold,
  SUM(revenue_amount)::numeric(14, 2) AS revenue_amount,
  SUM(cost_amount)::numeric(14, 2) AS cost_amount,
  SUM(profit_amount)::numeric(14, 2) AS profit_amount
FROM bi.products_performance_daily
GROUP BY company_owner_id, business_date, category;

CREATE INDEX bi_category_perf_owner_date_idx ON bi.category_performance_daily (company_owner_id, business_date, category);

CREATE MATERIALIZED VIEW bi.employee_performance_daily AS
SELECT
  o."userId" AS company_owner_id,
  DATE(o."createdAt") AS business_date,
  o."employeeId" AS employee_id,
  COALESCE(e."displayName", o."sellerName", 'Sem operador') AS employee_name,
  COUNT(*) FILTER (WHERE o.status = 'COMPLETED') AS completed_orders_count,
  COUNT(*) FILTER (WHERE o.status = 'CANCELLED') AS cancelled_orders_count,
  COALESCE(SUM(o."totalItems") FILTER (WHERE o.status = 'COMPLETED'), 0)::bigint AS items_count,
  COALESCE(SUM(o."totalRevenue") FILTER (WHERE o.status = 'COMPLETED'), 0)::numeric(14, 2) AS revenue_amount,
  COALESCE(SUM(o."totalCost") FILTER (WHERE o.status = 'COMPLETED'), 0)::numeric(14, 2) AS cost_amount,
  COALESCE(SUM(o."totalProfit") FILTER (WHERE o.status = 'COMPLETED'), 0)::numeric(14, 2) AS profit_amount,
  COALESCE(AVG(o."totalRevenue") FILTER (WHERE o.status = 'COMPLETED'), 0)::numeric(14, 2) AS avg_ticket_amount
FROM public."Order" o
LEFT JOIN public."Employee" e ON e.id = o."employeeId"
GROUP BY
  o."userId",
  DATE(o."createdAt"),
  o."employeeId",
  COALESCE(e."displayName", o."sellerName", 'Sem operador');

CREATE INDEX bi_employee_perf_owner_date_idx ON bi.employee_performance_daily (company_owner_id, business_date);
CREATE INDEX bi_employee_perf_owner_employee_idx ON bi.employee_performance_daily (company_owner_id, employee_id);

CREATE MATERIALIZED VIEW bi.cash_daily AS
SELECT
  cc."companyOwnerId" AS company_owner_id,
  DATE(cc."businessDate") AS business_date,
  cc.status::text AS status,
  cc."openSessionsCount" AS open_sessions_count,
  cc."openComandasCount" AS open_comandas_count,
  cc."expectedCashAmount"::numeric(14, 2) AS expected_cash_amount,
  COALESCE(cc."countedCashAmount", 0)::numeric(14, 2) AS counted_cash_amount,
  COALESCE(cc."differenceAmount", 0)::numeric(14, 2) AS difference_amount,
  cc."grossRevenueAmount"::numeric(14, 2) AS gross_revenue_amount,
  cc."realizedProfitAmount"::numeric(14, 2) AS realized_profit_amount,
  cc."closedAt" AS closed_at
FROM public."CashClosure" cc;

CREATE INDEX bi_cash_daily_owner_date_idx ON bi.cash_daily (company_owner_id, business_date);

CREATE MATERIALIZED VIEW bi.comandas_daily AS
SELECT
  c."companyOwnerId" AS company_owner_id,
  DATE(c."openedAt") AS business_date,
  COUNT(*) FILTER (WHERE c.status IN ('OPEN', 'IN_PREPARATION', 'READY')) AS open_comandas_count,
  COUNT(*) FILTER (WHERE c.status = 'CLOSED') AS closed_comandas_count,
  COALESCE(SUM(c."totalAmount"), 0)::numeric(14, 2) AS gross_amount,
  COALESCE(AVG(c."totalAmount") FILTER (WHERE c.status = 'CLOSED'), 0)::numeric(14, 2) AS avg_closed_ticket_amount,
  COALESCE(SUM(ci.quantity), 0)::bigint AS items_count
FROM public."Comanda" c
LEFT JOIN public."ComandaItem" ci ON ci."comandaId" = c.id
GROUP BY c."companyOwnerId", DATE(c."openedAt");

CREATE INDEX bi_comandas_daily_owner_date_idx ON bi.comandas_daily (company_owner_id, business_date);

CREATE VIEW bi.low_stock_snapshot AS
SELECT
  p."userId" AS company_owner_id,
  p.id AS product_id,
  p.name AS product_name,
  COALESCE(NULLIF(TRIM(p.brand), ''), 'Sem marca') AS brand,
  p.category,
  p.stock AS stock_quantity,
  COALESCE(p."lowStockThreshold", 0) AS low_stock_threshold,
  CASE
    WHEN p.stock <= COALESCE(p."lowStockThreshold", 0) THEN true
    ELSE false
  END AS is_low_stock,
  (p.stock::numeric * p."unitCost")::numeric(14, 2) AS inventory_cost_amount,
  (p.stock::numeric * p."unitPrice")::numeric(14, 2) AS inventory_revenue_amount
FROM public."Product" p
WHERE p.active = true;

COMMENT ON SCHEMA bi IS 'Schema analítico do Desk Imperial para BI e relatórios operacionais.';
