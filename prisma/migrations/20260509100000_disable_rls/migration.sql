-- Disable RLS on all tenant-isolated tables.
-- Tenant isolation is enforced at the application layer via
-- WHERE company_id = ? clauses in all Prisma queries.
-- RLS with set_config is incompatible with connection pooling
-- (set_config is connection-scoped; the pool reuses connections across requests).

ALTER TABLE "appointments"   DISABLE ROW LEVEL SECURITY;
ALTER TABLE "clients"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE "services"       DISABLE ROW LEVEL SECURITY;
ALTER TABLE "staff"          DISABLE ROW LEVEL SECURITY;
ALTER TABLE "business_hours" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications"  DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_appointments"   ON "appointments";
DROP POLICY IF EXISTS "tenant_isolation_clients"        ON "clients";
DROP POLICY IF EXISTS "tenant_isolation_services"       ON "services";
DROP POLICY IF EXISTS "tenant_isolation_staff"          ON "staff";
DROP POLICY IF EXISTS "tenant_isolation_business_hours" ON "business_hours";
DROP POLICY IF EXISTS "tenant_isolation_notifications"  ON "notifications";
