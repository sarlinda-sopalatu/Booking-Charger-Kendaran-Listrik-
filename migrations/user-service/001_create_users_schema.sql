-- =============================================================================
-- migrations/user-service/001_create_users_schema.sql
-- Skema awal untuk user-service
-- Jalankan: psql -U ev_user -d ev_users < migrations/user-service/001_create_users_schema.sql
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";  -- email case-insensitive

-- -------------------------------------------------------------------------
-- Tabel: users
-- Menyimpan data akun pengguna sistem booking charger EV
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          CITEXT NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  name           VARCHAR(100) NOT NULL,
  phone          VARCHAR(20) UNIQUE,
  ev_plate       VARCHAR(20),              -- Nomor plat kendaraan listrik
  role           VARCHAR(20) NOT NULL DEFAULT 'USER'
                   CHECK (role IN ('USER', 'ADMIN', 'OPERATOR')),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Tabel: refresh_tokens
-- Menyimpan refresh token JWT untuk sesi login yang persisten
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Indeks
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users (email);

CREATE INDEX IF NOT EXISTS idx_users_role
  ON users (role);

CREATE INDEX IF NOT EXISTS idx_users_is_active
  ON users (is_active)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens (user_id);

-- Cari token yang belum kadaluarsa dan belum dicabut
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active
  ON refresh_tokens (token_hash)
  WHERE revoked = FALSE;

COMMIT;
