-- ============================================================
-- Migration: 20260509000000_init
-- Sistema de Agendamento SaaS — schema inicial + RLS policies
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────────────────────

CREATE TYPE "company_status"      AS ENUM ('pending', 'active', 'blocked');
CREATE TYPE "subscription_status" AS ENUM ('active', 'overdue', 'grace', 'blocked');
CREATE TYPE "appointment_status"  AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE "cancelled_by"        AS ENUM ('client', 'company');
CREATE TYPE "notification_type"   AS ENUM (
  'new_appointment', 'changed_appointment', 'cancelled_appointment',
  'payment_due', 'payment_blocked'
);
CREATE TYPE "user_role" AS ENUM ('superadmin', 'company_admin');

-- ──────────────────────────────────────────────────────────────
-- TABLES
-- ──────────────────────────────────────────────────────────────

CREATE TABLE "companies" (
  "id"                 UUID            NOT NULL DEFAULT gen_random_uuid(),
  "name"               VARCHAR(255)    NOT NULL,
  "slug"               VARCHAR(100)    NOT NULL,
  "email"              VARCHAR(255)    NOT NULL,
  "phone"              VARCHAR(20),
  "status"             company_status  NOT NULL DEFAULT 'pending',
  "booking_link_token" UUID            NOT NULL DEFAULT gen_random_uuid(),
  "created_at"         TIMESTAMPTZ     NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ     NOT NULL DEFAULT now(),
  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "companies_slug_key"               ON "companies"("slug");
CREATE UNIQUE INDEX "companies_email_key"              ON "companies"("email");
CREATE UNIQUE INDEX "companies_booking_link_token_key" ON "companies"("booking_link_token");

-- max_staff and monthly_price are computed from plan_slots (read-only from app).
-- grace_period_end is computed from due_date.
CREATE TABLE "subscriptions" (
  "id"                  UUID                NOT NULL DEFAULT gen_random_uuid(),
  "company_id"          UUID                NOT NULL,
  "plan_slots"          INTEGER             NOT NULL DEFAULT 1,
  "max_staff"           INTEGER             GENERATED ALWAYS AS (plan_slots * 5) STORED,
  "monthly_price"       DECIMAL(10,2)       GENERATED ALWAYS AS (plan_slots * 50) STORED,
  "due_date"            DATE                NOT NULL,
  "grace_period_end"    DATE                GENERATED ALWAYS AS (due_date + 5) STORED,
  "status"              subscription_status NOT NULL DEFAULT 'active',
  "gateway_payment_id"  VARCHAR(255),
  "created_at"          TIMESTAMPTZ         NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ         NOT NULL DEFAULT now(),
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id")
);

CREATE TABLE "users" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "company_id"    UUID,
  "name"          VARCHAR(255) NOT NULL,
  "email"         VARCHAR(255) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "role"          user_role   NOT NULL DEFAULT 'company_admin',
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "users_pkey"  PRIMARY KEY ("id"),
  CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- RLS-protected tables start here
CREATE TABLE "staff" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID        NOT NULL,
  "name"       VARCHAR(255) NOT NULL,
  "email"      VARCHAR(255),
  "phone"      VARCHAR(20),
  "is_active"  BOOLEAN     NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "staff_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "staff_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id")
);

CREATE TABLE "services" (
  "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
  "company_id"       UUID          NOT NULL,
  "staff_id"         UUID,
  "name"             VARCHAR(255)  NOT NULL,
  "description"      TEXT,
  "duration_minutes" INTEGER       NOT NULL,
  "price"            DECIMAL(10,2),
  "is_active"        BOOLEAN       NOT NULL DEFAULT true,
  "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT "services_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id"),
  CONSTRAINT "services_staff_id_fkey"   FOREIGN KEY ("staff_id")   REFERENCES "staff"("id")
);

CREATE TABLE "business_hours" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "company_id"  UUID        NOT NULL,
  "staff_id"    UUID        NOT NULL,
  "day_of_week" SMALLINT    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  "open_time"   TIME        NOT NULL,
  "close_time"  TIME        NOT NULL,
  "is_open"     BOOLEAN     NOT NULL DEFAULT true,
  CONSTRAINT "business_hours_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "business_hours_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id"),
  CONSTRAINT "business_hours_staff_id_fkey"   FOREIGN KEY ("staff_id")   REFERENCES "staff"("id")
);

CREATE TABLE "clients" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "company_id"   UUID        NOT NULL,
  "name"         VARCHAR(255) NOT NULL,
  "email"        VARCHAR(255),
  "phone"        VARCHAR(20),
  "is_temporary" BOOLEAN     NOT NULL DEFAULT false,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "clients_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id")
);

CREATE TABLE "appointments" (
  "id"               UUID               NOT NULL DEFAULT gen_random_uuid(),
  "company_id"       UUID               NOT NULL,
  "staff_id"         UUID               NOT NULL,
  "service_id"       UUID               NOT NULL,
  "client_id"        UUID,
  "scheduled_at"     TIMESTAMPTZ        NOT NULL,
  "duration_minutes" INTEGER            NOT NULL,
  "service_name"     VARCHAR(255)       NOT NULL,
  "status"           appointment_status NOT NULL DEFAULT 'pending',
  "cancelled_by"     cancelled_by,
  "notes"            TEXT,
  "created_at"       TIMESTAMPTZ        NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ        NOT NULL DEFAULT now(),
  CONSTRAINT "appointments_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "appointments_company_id_fkey"   FOREIGN KEY ("company_id") REFERENCES "companies"("id"),
  CONSTRAINT "appointments_staff_id_fkey"     FOREIGN KEY ("staff_id")   REFERENCES "staff"("id"),
  CONSTRAINT "appointments_service_id_fkey"   FOREIGN KEY ("service_id") REFERENCES "services"("id"),
  CONSTRAINT "appointments_client_id_fkey"    FOREIGN KEY ("client_id")  REFERENCES "clients"("id")
);

CREATE TABLE "notifications" (
  "id"             UUID              NOT NULL DEFAULT gen_random_uuid(),
  "company_id"     UUID              NOT NULL,
  "type"           notification_type NOT NULL,
  "appointment_id" UUID,
  "message"        TEXT              NOT NULL,
  "is_read"        BOOLEAN           NOT NULL DEFAULT false,
  "created_at"     TIMESTAMPTZ       NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_pkey"                PRIMARY KEY ("id"),
  CONSTRAINT "notifications_company_id_fkey"     FOREIGN KEY ("company_id")     REFERENCES "companies"("id"),
  CONSTRAINT "notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
);

-- ──────────────────────────────────────────────────────────────
-- INDEXES (performance)
-- ──────────────────────────────────────────────────────────────

CREATE INDEX "appointments_company_id_scheduled_at_idx" ON "appointments"("company_id", "scheduled_at");
CREATE INDEX "appointments_staff_id_scheduled_at_idx"   ON "appointments"("staff_id", "scheduled_at");
CREATE INDEX "appointments_client_id_idx"               ON "appointments"("client_id");
CREATE INDEX "notifications_company_id_is_read_idx"     ON "notifications"("company_id", "is_read");
CREATE INDEX "staff_company_id_idx"                     ON "staff"("company_id");
CREATE INDEX "services_company_id_staff_id_idx"         ON "services"("company_id", "staff_id");
CREATE INDEX "business_hours_staff_id_day_of_week_idx"  ON "business_hours"("staff_id", "day_of_week");

-- ──────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────
-- The tenant middleware sets app.current_company_id before every
-- authenticated query:
--   SELECT set_config('app.current_company_id', $companyId, true)
-- Public booking routes bypass RLS by identifying the tenant via
-- booking_link_token, not by JWT.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE "appointments"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "services"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_hours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications"  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_appointments" ON "appointments"
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY "tenant_isolation_clients" ON "clients"
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY "tenant_isolation_services" ON "services"
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY "tenant_isolation_staff" ON "staff"
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY "tenant_isolation_business_hours" ON "business_hours"
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY "tenant_isolation_notifications" ON "notifications"
  USING (company_id = current_setting('app.current_company_id', true)::uuid);
