-- =============================================================================
-- migrations/station-service/001_create_stations_schema.sql
-- Skema awal untuk station-service
-- Jalankan: psql -U ev_user -d ev_stations < migrations/station-service/001_create_stations_schema.sql
-- =============================================================================

BEGIN;

-- Aktifkan ekstensi
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- Tabel: stations
-- Menyimpan data stasiun pengisian kendaraan listrik
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(255) NOT NULL,
  address        TEXT NOT NULL,
  latitude       DECIMAL(10, 8) NOT NULL,
  longitude      DECIMAL(11, 8) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'CLOSED')),
  operator_id    UUID,
  phone          VARCHAR(20),
  opening_hours  VARCHAR(100) DEFAULT '24/7',
  facilities     JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Tabel: chargers
-- Satu stasiun bisa punya banyak charger
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chargers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id            UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  connector_type        VARCHAR(20) NOT NULL
                          CHECK (connector_type IN ('AC_TYPE1','AC_TYPE2','DC_CCS2','DC_CHAdeMO','DC_GB_T')),
  max_power_kw          DECIMAL(8, 2) NOT NULL CHECK (max_power_kw > 0),
  status                VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
                          CHECK (status IN ('AVAILABLE','OCCUPIED','RESERVED','FAULTED','OFFLINE')),
  serial_number         VARCHAR(100) UNIQUE,
  ocpp_charge_point_id  VARCHAR(100) UNIQUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Tabel: slots
-- Slot waktu yang bisa dipesan per charger per hari
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slots (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  charger_id     UUID NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
  slot_date      DATE NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
                   CHECK (status IN ('AVAILABLE','RESERVED','OCCUPIED','MAINTENANCE')),
  price_per_kwh  DECIMAL(10, 2) NOT NULL DEFAULT 2500 CHECK (price_per_kwh >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Satu charger tidak boleh punya dua slot di tanggal & jam yang sama
  CONSTRAINT unique_charger_slot UNIQUE (charger_id, slot_date, start_time),

  -- Validasi waktu
  CONSTRAINT valid_slot_time CHECK (end_time > start_time)
);

-- -------------------------------------------------------------------------
-- Indeks untuk query panas
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chargers_station_id
  ON chargers (station_id);

CREATE INDEX IF NOT EXISTS idx_slots_charger_date
  ON slots (charger_id, slot_date);

CREATE INDEX IF NOT EXISTS idx_slots_status
  ON slots (status);

CREATE INDEX IF NOT EXISTS idx_stations_status
  ON stations (status);

COMMIT;
