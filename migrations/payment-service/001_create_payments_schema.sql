-- =============================================================================
-- migrations/payment-service/001_create_payments_schema.sql
-- Skema awal untuk payment-service
-- Jalankan: psql -U ev_user -d ev_payments < migrations/payment-service/001_create_payments_schema.sql
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- Tabel: payments
-- Mencatat setiap transaksi pembayaran booking charger
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id     UUID NOT NULL UNIQUE,   -- satu booking = satu pembayaran
  user_id        UUID NOT NULL,
  amount_idr     DECIMAL(12, 2) NOT NULL CHECK (amount_idr >= 0),
  method         VARCHAR(20) NOT NULL
                   CHECK (method IN ('QRIS','BANK_TRANSFER','E_WALLET','CREDIT_CARD')),
  status         VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','REFUNDED','EXPIRED')),
  external_ref   VARCHAR(255),           -- ID transaksi dari Midtrans / payment gateway
  payment_url    TEXT,                   -- URL halaman pembayaran (untuk redirect)
  qr_string      TEXT,                   -- String QR untuk QRIS
  expires_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Tabel: payment_events
-- Audit trail setiap perubahan status pembayaran
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id  UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type  VARCHAR(50) NOT NULL,   -- CREATED, PROCESSING, COMPLETED, FAILED, REFUNDED
  data        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Tabel: refunds
-- Mencatat permintaan dan proses refund
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refunds (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id   UUID NOT NULL REFERENCES payments(id),
  amount_idr   DECIMAL(12, 2) NOT NULL CHECK (amount_idr > 0),
  reason       TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED')),
  processed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Indeks
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payments_booking_id
  ON payments (booking_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id
  ON payments (user_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
  ON payments (status);

-- Cari berdasarkan referensi eksternal (webhook dari Midtrans)
CREATE INDEX IF NOT EXISTS idx_payments_external_ref
  ON payments (external_ref)
  WHERE external_ref IS NOT NULL;

-- Cari pembayaran yang akan expired
CREATE INDEX IF NOT EXISTS idx_payments_expires_at
  ON payments (expires_at)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id
  ON payment_events (payment_id);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id
  ON refunds (payment_id);

COMMIT;
