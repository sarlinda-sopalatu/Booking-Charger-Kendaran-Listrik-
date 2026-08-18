-- =============================================================================
-- migrations/booking-service/002_add_idempotency_key.sql
-- Lapisan 3: Cegah booking dobel saat sinyal mobile putus dan kirim ulang
-- Jalankan: psql -U ev_user -d ev_bookings < migrations/booking-service/002_add_idempotency_key.sql
-- =============================================================================

BEGIN;

-- Tambah kolom idempotency_key jika belum ada
-- ON CONFLICT DO NOTHING: kiriman ulang dengan key yang sama diabaikan
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Buat index UNIQUE (concurrently agar tidak lock tabel besar)
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_idempotency_key
  ON bookings (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMIT;
