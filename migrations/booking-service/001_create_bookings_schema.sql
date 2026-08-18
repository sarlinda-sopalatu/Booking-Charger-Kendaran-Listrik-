-- =============================================================================
-- migrations/booking-service/001_create_bookings_schema.sql
-- Skema awal untuk booking-service
-- PENTING: Menggunakan exclusion constraint untuk mencegah double booking
-- Jalankan: psql -U ev_user -d ev_bookings < migrations/booking-service/001_create_bookings_schema.sql
-- =============================================================================

BEGIN;

-- Aktifkan ekstensi yang dibutuhkan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- btree_gist WAJIB ada untuk exclusion constraint pada rentang waktu
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- -------------------------------------------------------------------------
-- Tabel: bookings
-- Menyimpan data pemesanan slot charger
--
-- KUNCI: exclusion constraint (slot_id WITH =, rentang WITH &&)
-- Artinya: satu slot_id tidak boleh punya dua booking dengan rentang
-- waktu yang bertabrakan (&&). Database yang menolak otomatis.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL,
  slot_id          UUID NOT NULL,
  -- Rentang waktu booking: misal '[2026-08-18 08:00, 2026-08-18 10:00)'
  rentang          TSTZRANGE NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'PENDING_PAYMENT'
                     CHECK (status IN (
                       'PENDING_PAYMENT','CONFIRMED','CHARGING',
                       'COMPLETED','CANCELLED','EXPIRED'
                     )),
  notes            TEXT,
  expires_at       TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  -- Idempotency key: cegah booking dobel saat sinyal buruk (Lapisan 3)
  idempotency_key  TEXT UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- EXCLUSION CONSTRAINT: cegah double booking pada rentang waktu bertabrakan
  -- Dua booking TIDAK BOLEH: slot_id sama DAN rentang waktunya overlap (&&)
  EXCLUDE USING gist (slot_id WITH =, rentang WITH &&)
    WHERE (status NOT IN ('CANCELLED', 'EXPIRED'))
);

-- -------------------------------------------------------------------------
-- Tabel: booking_events
-- Log semua perubahan status booking (audit trail)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_type  VARCHAR(50) NOT NULL,
  data        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Indeks untuk query panas
-- -------------------------------------------------------------------------
-- Query riwayat booking per user (sering dipakai di halaman "Booking Saya")
CREATE INDEX IF NOT EXISTS idx_bookings_user_id
  ON bookings (user_id);

-- Query booking per slot (dipakai saat cek ketersediaan)
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id
  ON bookings (slot_id);

-- Query berdasarkan status (misal: cari semua EXPIRED untuk dibersihkan)
CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON bookings (status);

-- Query booking yang akan expired (untuk auto-release)
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at
  ON bookings (expires_at)
  WHERE status = 'PENDING_PAYMENT';

-- Indeks untuk booking_events
CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id
  ON booking_events (booking_id);

COMMIT;
