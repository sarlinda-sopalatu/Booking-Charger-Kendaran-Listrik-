-- =============================================================================
-- seeds/station-service/seed_stations.sql
-- Seed kompatibel dengan schema runtime saat ini (id + created_at + updated_at wajib)
-- Jalankan: psql -U ev_user -d ev_stations < seeds/station-service/seed_stations.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Stations
-- -----------------------------------------------------------------------------
INSERT INTO stations (
  id, name, address, latitude, longitude, status, phone, opening_hours, facilities, created_at, updated_at
) VALUES
(
  'a1b2c3d4-0001-0001-0001-000000000001',
  'SPKLU PLN Monas',
  'Jl. Medan Merdeka Barat, Gambir, Jakarta Pusat, DKI Jakarta',
  -6.1754, 106.8272, 'ACTIVE', '(021) 123-4001', '24/7',
  '["parking", "toilet", "wifi", "cafe"]'::jsonb,
  NOW(), NOW()
),
(
  'a1b2c3d4-0001-0001-0001-000000000002',
  'SPKLU Shell Kuningan',
  'Jl. HR Rasuna Said Kav. 5, Kuningan, Jakarta Selatan',
  -6.2088, 106.8306, 'ACTIVE', '(021) 123-4002', '06:00-22:00',
  '["parking", "toilet", "wifi", "minimarket"]'::jsonb,
  NOW(), NOW()
),
(
  'a1b2c3d4-0001-0001-0001-000000000003',
  'SPKLU BPJT Tol Cikampek',
  'Rest Area KM 57 Tol Jakarta-Cikampek, Karawang, Jawa Barat',
  -6.3521, 107.1432, 'ACTIVE', '(021) 123-4003', '24/7',
  '["parking", "toilet", "mushola", "minimarket", "restoran"]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Chargers
-- -----------------------------------------------------------------------------
INSERT INTO chargers (
  id, station_id, connector_type, max_power_kw, status, serial_number, created_at, updated_at
) VALUES
('b1b2c3d4-0002-0001-0001-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'AC_TYPE2', 22.0,  'AVAILABLE', 'PLN-MON-AC-001', NOW(), NOW()),
('b1b2c3d4-0002-0001-0001-000000000002', 'a1b2c3d4-0001-0001-0001-000000000001', 'DC_CCS2',  50.0,  'AVAILABLE', 'PLN-MON-DC-001', NOW(), NOW()),
('b1b2c3d4-0002-0001-0001-000000000003', 'a1b2c3d4-0001-0001-0001-000000000002', 'AC_TYPE2', 22.0,  'AVAILABLE', 'SHL-KUN-AC-001', NOW(), NOW()),
('b1b2c3d4-0002-0001-0001-000000000004', 'a1b2c3d4-0001-0001-0001-000000000002', 'DC_CCS2',  50.0,  'AVAILABLE', 'SHL-KUN-DC-001', NOW(), NOW()),
('b1b2c3d4-0002-0001-0001-000000000005', 'a1b2c3d4-0001-0001-0001-000000000003', 'DC_CCS2', 150.0,  'AVAILABLE', 'BJT-CKP-DC-001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Slots (hari ini dan besok)
-- -----------------------------------------------------------------------------
INSERT INTO slots (
  id, charger_id, slot_date, start_time, end_time, status, price_per_kwh, created_at, updated_at
) VALUES
('c1b2c3d4-3000-0001-0001-000000000001', 'b1b2c3d4-0002-0001-0001-000000000001', CURRENT_DATE,     '08:00', '10:00', 'AVAILABLE', 2500, NOW(), NOW()),
('c1b2c3d4-3000-0001-0001-000000000002', 'b1b2c3d4-0002-0001-0001-000000000001', CURRENT_DATE,     '10:00', '12:00', 'AVAILABLE', 3000, NOW(), NOW()),
('c1b2c3d4-3000-0001-0001-000000000003', 'b1b2c3d4-0002-0001-0001-000000000002', CURRENT_DATE,     '12:00', '14:00', 'AVAILABLE', 4500, NOW(), NOW()),
('c1b2c3d4-3000-0001-0001-000000000004', 'b1b2c3d4-0002-0001-0001-000000000003', CURRENT_DATE,     '14:00', '16:00', 'AVAILABLE', 3000, NOW(), NOW()),
('c1b2c3d4-3000-0001-0001-000000000005', 'b1b2c3d4-0002-0001-0001-000000000004', CURRENT_DATE,     '16:00', '18:00', 'AVAILABLE', 4000, NOW(), NOW()),
('c1b2c3d4-3000-0001-0001-000000000006', 'b1b2c3d4-0002-0001-0001-000000000005', CURRENT_DATE + 1, '08:00', '10:00', 'AVAILABLE', 4500, NOW(), NOW()),
('c1b2c3d4-3000-0001-0001-000000000007', 'b1b2c3d4-0002-0001-0001-000000000005', CURRENT_DATE + 1, '10:00', '12:00', 'AVAILABLE', 4500, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
