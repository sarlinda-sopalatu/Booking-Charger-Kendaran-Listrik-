-- =============================================================================
-- db/init.sql
-- Dijalankan SEKALI saat volume Postgres pertama kali dibuat.
-- Setiap layanan punya database sendiri (database-per-service pattern).
-- =============================================================================

-- Catatan: Di repo ini setiap layanan sudah punya container Postgres
-- terpisah (postgres-users, postgres-stations, postgres-bookings,
-- postgres-payments), sehingga file ini hanya digunakan jika ingin
-- menggunakan satu instance Postgres dengan banyak database logis.

-- Database per layanan
CREATE DATABASE IF NOT EXISTS ev_stations;   -- milik station-service
CREATE DATABASE IF NOT EXISTS ev_bookings;   -- milik booking-service
CREATE DATABASE IF NOT EXISTS ev_sessions;   -- milik session-service
CREATE DATABASE IF NOT EXISTS ev_payments;   -- milik billing-service & payment-service
CREATE DATABASE IF NOT EXISTS ev_users;      -- milik user-service

-- Aktifkan ekstensi btree_gist di ev_bookings
-- (dibutuhkan untuk exclusion constraint pada rentang waktu)
\c ev_bookings
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c ev_stations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c ev_sessions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c ev_payments
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c ev_users
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
