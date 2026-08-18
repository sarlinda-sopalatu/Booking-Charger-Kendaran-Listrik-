-- =============================================================================
-- migrations/billing-service/001_create_billing_schema.sql
-- Skema awal untuk billing-service & payment-service
-- Jalankan: psql -U ev_user -d ev_payments < migrations/billing-service/001_create_billing_schema.sql
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- Tabel: payments
-- Mencatat transaksi pembayaran
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL UNIQUE,  -- satu booking = satu pembayaran
  user_id       UUID NOT NULL,
  amount_idr    DECIMAL(12, 2) NOT NULL CHECK (amount_idr >= 0),
  method        VARCHAR(20) NOT NULL
                  CHECK (method IN ('QRIS','BANK_TRANSFER','E_WALLET','CREDIT_CARD')),
  status        VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','REFUNDED','EXPIRED')),
  external_ref  VARCHAR(255),
  payment_url   TEXT,
  qr_string     TEXT,
  expires_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Tabel: invoices
-- Invoice yang diterbitkan setelah pembayaran selesai
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id      UUID NOT NULL UNIQUE REFERENCES payments(id),
  invoice_number  VARCHAR(50) NOT NULL UNIQUE,
  items           JSONB DEFAULT '[]',
  subtotal_idr    DECIMAL(12, 2) NOT NULL CHECK (subtotal_idr >= 0),
  tax_idr         DECIMAL(12, 2) DEFAULT 0 CHECK (tax_idr >= 0),
  total_idr       DECIMAL(12, 2) NOT NULL CHECK (total_idr >= 0),
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- Cari pembayaran berdasarkan referensi eksternal (Midtrans, dll)
CREATE INDEX IF NOT EXISTS idx_payments_external_ref
  ON payments (external_ref)
  WHERE external_ref IS NOT NULL;

COMMIT;
