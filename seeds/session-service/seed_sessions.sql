-- =============================================================================
-- seeds/session-service/seed_sessions.sql
-- Data contoh: sesi pengisian daya dan pembacaan sensor
-- Jalankan: psql -U ev_user -d ev_sessions < seeds/session-service/seed_sessions.sql
-- =============================================================================

-- -------------------------------------------------------------------------
-- Data sesi pengisian daya
-- Hanya booking berstatus CONFIRMED/COMPLETED yang punya sesi
-- -------------------------------------------------------------------------
INSERT INTO charging_sessions (
  id, booking_id, charger_id, user_id, status,
  started_at, completed_at,
  energy_kwh_start, energy_kwh_end, energy_kwh_used,
  peak_power_kw, avg_power_kw, duration_minutes,
  stop_reason, tariff_per_kwh, total_cost_idr,
  created_at
) VALUES
(
  'g1b2c3d4-0007-0001-0001-000000000001',
  'd1b2c3d4-0004-0001-0001-000000000001',  -- Booking Budi Santoso (CONFIRMED)
  'b1b2c3d4-0002-0001-0001-000000000001',  -- Charger AC Monas
  'c1b2c3d4-0003-0001-0001-000000000001',  -- Budi Santoso
  'COMPLETED',
  NOW()::date + '08:00'::time,
  NOW()::date + '09:47'::time,
  15.2000,   -- kWh awal baterai
  29.0000,   -- kWh akhir baterai
  13.8000,   -- total energi terpakai
  7.40,      -- puncak daya (kW)
  7.10,      -- rata-rata daya (kW)
  107,       -- durasi (menit)
  'COMPLETED_NORMALLY',
  2500.00,
  34500.00,
  NOW() - INTERVAL '2 hours'
),
(
  'g1b2c3d4-0007-0001-0001-000000000002',
  'd1b2c3d4-0004-0001-0001-000000000003',  -- Booking Andi Wijaya DC (CONFIRMED)
  'b1b2c3d4-0002-0001-0001-000000000002',  -- Charger DC Monas
  'c1b2c3d4-0003-0001-0001-000000000003',  -- Andi Wijaya
  'ACTIVE',
  NOW()::date + '14:00'::time,
  NULL,
  10.0000,
  28.0000,
  18.0000,
  50.00,
  47.50,
  NULL,
  NULL,
  3500.00,
  0.00,   -- belum selesai, biaya belum dihitung
  NOW() - INTERVAL '1 hour'
),
(
  'g1b2c3d4-0007-0001-0001-000000000003',
  'd1b2c3d4-0004-0001-0001-000000000004',  -- Booking Dewi Kusuma (CONFIRMED - jadwal besok)
  'b1b2c3d4-0002-0001-0001-000000000007',  -- Charger DC Cikampek
  'c1b2c3d4-0003-0001-0001-000000000004',  -- Dewi Kusuma
  'WAITING',
  NULL,
  NULL,
  0.0000,
  0.0000,
  0.0000,
  0.00,
  0.00,
  0,
  NULL,
  2500.00,
  0.00,
  NOW()
)
ON CONFLICT (booking_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- Contoh pembacaan sensor (power_readings) untuk sesi yang sudah COMPLETED
-- Interval 10 detik selama ~5 menit pertama sesi Budi Santoso
-- -------------------------------------------------------------------------
INSERT INTO power_readings (session_id, charger_id, power_kw, energy_kwh_cumulative, voltage_v, current_a, state_of_charge_pct, temperature_c, recorded_at) VALUES
(
  'g1b2c3d4-0007-0001-0001-000000000001',
  'b1b2c3d4-0002-0001-0001-000000000001',
  6.900, 15.219, 230.10, 30.00, 31.5, 28.2,
  NOW()::date + '08:00:10'::time
),
(
  'g1b2c3d4-0007-0001-0001-000000000001',
  'b1b2c3d4-0002-0001-0001-000000000001',
  7.100, 15.239, 230.20, 30.85, 31.7, 28.4,
  NOW()::date + '08:00:20'::time
),
(
  'g1b2c3d4-0007-0001-0001-000000000001',
  'b1b2c3d4-0002-0001-0001-000000000001',
  7.200, 15.259, 230.15, 31.28, 31.9, 28.5,
  NOW()::date + '08:00:30'::time
),
(
  'g1b2c3d4-0007-0001-0001-000000000001',
  'b1b2c3d4-0002-0001-0001-000000000001',
  7.350, 15.279, 230.30, 31.96, 32.1, 28.6,
  NOW()::date + '08:00:40'::time
),
(
  'g1b2c3d4-0007-0001-0001-000000000001',
  'b1b2c3d4-0002-0001-0001-000000000001',
  7.400, 15.300, 230.25, 32.17, 32.3, 28.7,
  NOW()::date + '08:00:50'::time
),
-- Contoh pembacaan untuk sesi Andi Wijaya yang sedang ACTIVE
(
  'g1b2c3d4-0007-0001-0001-000000000002',
  'b1b2c3d4-0002-0001-0001-000000000002',
  49.500, 10.138, 400.10, 124.00, 42.0, 32.1,
  NOW()::date + '14:00:10'::time
),
(
  'g1b2c3d4-0007-0001-0001-000000000002',
  'b1b2c3d4-0002-0001-0001-000000000002',
  50.000, 10.276, 400.20, 125.00, 42.5, 32.3,
  NOW()::date + '14:00:20'::time
),
(
  'g1b2c3d4-0007-0001-0001-000000000002',
  'b1b2c3d4-0002-0001-0001-000000000002',
  49.800, 10.414, 400.05, 124.50, 43.0, 32.5,
  NOW()::date + '14:00:30'::time
);
