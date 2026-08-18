-- =============================================================================
-- migrations/session-service/001_create_sessions_schema.sql
-- Skema awal untuk session-service
-- Jalankan: psql -U ev_user -d ev_sessions < migrations/session-service/001_create_sessions_schema.sql
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- Tabel: charging_sessions
-- Mencatat sesi pengisian daya dari mulai hingga selesai
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS charging_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id          UUID NOT NULL UNIQUE,   -- satu booking = satu sesi
  charger_id          UUID NOT NULL,
  user_id             UUID NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'WAITING'
                        CHECK (status IN ('WAITING','ACTIVE','COMPLETED','ERROR')),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  -- Data energi
  energy_kwh_start    DECIMAL(10, 4) DEFAULT 0 CHECK (energy_kwh_start >= 0),
  energy_kwh_end      DECIMAL(10, 4) DEFAULT 0 CHECK (energy_kwh_end >= 0),
  energy_kwh_used     DECIMAL(10, 4) DEFAULT 0 CHECK (energy_kwh_used >= 0),
  peak_power_kw       DECIMAL(8, 2)  DEFAULT 0 CHECK (peak_power_kw >= 0),
  avg_power_kw        DECIMAL(8, 2)  DEFAULT 0 CHECK (avg_power_kw >= 0),
  duration_minutes    INTEGER        DEFAULT 0 CHECK (duration_minutes >= 0),
  -- Konteks
  stop_reason         VARCHAR(50),
  error_message       TEXT,
  tariff_per_kwh      DECIMAL(10, 2) NOT NULL DEFAULT 2500 CHECK (tariff_per_kwh >= 0),
  total_cost_idr      DECIMAL(12, 2) DEFAULT 0 CHECK (total_cost_idr >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Tabel: power_readings
-- Pembacaan sensor charger setiap interval (default 10 detik)
-- Data ini tumbuh SANGAT CEPAT, indeks wajib ada
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS power_readings (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id              UUID NOT NULL REFERENCES charging_sessions(id) ON DELETE CASCADE,
  charger_id              UUID NOT NULL,
  power_kw                DECIMAL(8, 3) DEFAULT 0,
  energy_kwh_cumulative   DECIMAL(10, 4) DEFAULT 0,
  voltage_v               DECIMAL(7, 2)  DEFAULT 0,
  current_a               DECIMAL(7, 2)  DEFAULT 0,
  state_of_charge_pct     DECIMAL(5, 2)  DEFAULT 0,
  temperature_c           DECIMAL(6, 2)  DEFAULT 0,
  recorded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Indeks — WAJIB karena power_readings bisa jutaan baris
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessions_booking_id
  ON charging_sessions (booking_id);

CREATE INDEX IF NOT EXISTS idx_sessions_charger_id
  ON charging_sessions (charger_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
  ON charging_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_status
  ON charging_sessions (status);

-- Indeks komposit untuk power_readings: query "pembacaan sesi X urut waktu"
CREATE INDEX IF NOT EXISTS idx_readings_session_time
  ON power_readings (session_id, recorded_at DESC);

-- Indeks untuk monitoring per charger
CREATE INDEX IF NOT EXISTS idx_readings_charger_time
  ON power_readings (charger_id, recorded_at DESC);

COMMIT;
