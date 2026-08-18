-- =============================================================================
-- seeds/station-service/seed_stations.sql
-- Data contoh: Stasiun Charger, Charger, dan Slot Waktu
-- Jalankan: psql -U ev_user -d ev_stations < seeds/station-service/seed_stations.sql
-- =============================================================================

-- -------------------------------------------------------------------------
-- Data Stasiun Pengisian Kendaraan Listrik di Indonesia
-- -------------------------------------------------------------------------
INSERT INTO stations (id, name, address, latitude, longitude, status, phone, opening_hours, facilities) VALUES
(
  'a1b2c3d4-0001-0001-0001-000000000001',
  'SPKLU PLN Monas',
  'Jl. Medan Merdeka Barat, Gambir, Jakarta Pusat, DKI Jakarta',
  -6.1754, 106.8272, 'ACTIVE', '(021) 123-4001', '24/7',
  '["parking", "toilet", "wifi", "cafe"]'
),
(
  'a1b2c3d4-0001-0001-0001-000000000002',
  'SPKLU Shell Kuningan',
  'Jl. HR Rasuna Said Kav. 5, Kuningan, Jakarta Selatan',
  -6.2088, 106.8306, 'ACTIVE', '(021) 123-4002', '06:00-22:00',
  '["parking", "toilet", "wifi", "minimarket"]'
),
(
  'a1b2c3d4-0001-0001-0001-000000000003',
  'SPKLU BPJT Tol Cikampek',
  'Rest Area KM 57 Tol Jakarta-Cikampek, Karawang, Jawa Barat',
  -6.3521, 107.1432, 'ACTIVE', '(021) 123-4003', '24/7',
  '["parking", "toilet", "mushola", "minimarket", "restoran"]'
),
(
  'a1b2c3d4-0001-0001-0001-000000000004',
  'SPKLU Pertamina Fatmawati',
  'Jl. RS Fatmawati No. 31, Cilandak, Jakarta Selatan',
  -6.2921, 106.7951, 'ACTIVE', '(021) 123-4004', '24/7',
  '["parking", "toilet", "wifi"]'
),
(
  'a1b2c3d4-0001-0001-0001-000000000005',
  'SPKLU Mall Grand Indonesia',
  'Jl. MH Thamrin No. 1, Menteng, Jakarta Pusat',
  -6.1954, 106.8215, 'ACTIVE', '(021) 123-4005', '10:00-22:00',
  '["parking", "toilet", "wifi", "mall", "restoran"]'
),
(
  'a1b2c3d4-0001-0001-0001-000000000006',
  'SPKLU PLN Makassar Panakkukang',
  'Jl. Boulevard, Panakkukang, Makassar, Sulawesi Selatan',
  -5.1477, 119.4327, 'ACTIVE', '(0411) 123-4006', '24/7',
  '["parking", "toilet", "wifi"]'
),
(
  'a1b2c3d4-0001-0001-0001-000000000007',
  'SPKLU Pertamina Surabaya Darmo',
  'Jl. Raya Darmo No. 80, Wonokromo, Surabaya, Jawa Timur',
  -7.2902, 112.7310, 'ACTIVE', '(031) 123-4007', '24/7',
  '["parking", "toilet", "wifi", "minimarket"]'
),
(
  'a1b2c3d4-0001-0001-0001-000000000008',
  'SPKLU PLN Bandung Dago',
  'Jl. Ir. H. Juanda No. 100, Coblong, Bandung, Jawa Barat',
  -6.8851, 107.6143, 'ACTIVE', '(022) 123-4008', '06:00-23:00',
  '["parking", "toilet", "wifi", "cafe"]'
);

-- -------------------------------------------------------------------------
-- Data Charger per Stasiun
-- Tipe konektor: AC_TYPE2 (umum), DC_CCS2 (cepat), DC_CHAdeMO (Nissan/Mitsubishi)
-- -------------------------------------------------------------------------
INSERT INTO chargers (id, station_id, connector_type, max_power_kw, status, serial_number) VALUES
-- Monas (3 charger)
('b1b2c3d4-0002-0001-0001-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'AC_TYPE2',  22.0, 'AVAILABLE', 'PLN-MON-AC-001'),
('b1b2c3d4-0002-0001-0001-000000000002', 'a1b2c3d4-0001-0001-0001-000000000001', 'DC_CCS2',   50.0, 'AVAILABLE', 'PLN-MON-DC-001'),
('b1b2c3d4-0002-0001-0001-000000000003', 'a1b2c3d4-0001-0001-0001-000000000001', 'DC_CCS2',  150.0, 'AVAILABLE', 'PLN-MON-DC-002'),
-- Kuningan (2 charger)
('b1b2c3d4-0002-0001-0001-000000000004', 'a1b2c3d4-0001-0001-0001-000000000002', 'AC_TYPE2',  22.0, 'AVAILABLE', 'SHL-KUN-AC-001'),
('b1b2c3d4-0002-0001-0001-000000000005', 'a1b2c3d4-0001-0001-0001-000000000002', 'DC_CCS2',   50.0, 'AVAILABLE', 'SHL-KUN-DC-001'),
-- Cikampek (4 charger)
('b1b2c3d4-0002-0001-0001-000000000006', 'a1b2c3d4-0001-0001-0001-000000000003', 'AC_TYPE2',  22.0, 'AVAILABLE', 'BJT-CKP-AC-001'),
('b1b2c3d4-0002-0001-0001-000000000007', 'a1b2c3d4-0001-0001-0001-000000000003', 'DC_CCS2',   50.0, 'AVAILABLE', 'BJT-CKP-DC-001'),
('b1b2c3d4-0002-0001-0001-000000000008', 'a1b2c3d4-0001-0001-0001-000000000003', 'DC_CCS2',  150.0, 'AVAILABLE', 'BJT-CKP-DC-002'),
('b1b2c3d4-0002-0001-0001-000000000009', 'a1b2c3d4-0001-0001-0001-000000000003', 'DC_CHAdeMO', 50.0, 'AVAILABLE', 'BJT-CKP-CH-001'),
-- Fatmawati (2 charger)
('b1b2c3d4-0002-0001-0001-000000000010', 'a1b2c3d4-0001-0001-0001-000000000004', 'AC_TYPE2',  22.0, 'AVAILABLE', 'PTM-FAT-AC-001'),
('b1b2c3d4-0002-0001-0001-000000000011', 'a1b2c3d4-0001-0001-0001-000000000004', 'DC_CCS2',   50.0, 'AVAILABLE', 'PTM-FAT-DC-001'),
-- Grand Indonesia (2 charger)
('b1b2c3d4-0002-0001-0001-000000000012', 'a1b2c3d4-0001-0001-0001-000000000005', 'AC_TYPE2',  22.0, 'AVAILABLE', 'GI-THM-AC-001'),
('b1b2c3d4-0002-0001-0001-000000000013', 'a1b2c3d4-0001-0001-0001-000000000005', 'DC_CCS2',   50.0, 'AVAILABLE', 'GI-THM-DC-001'),
-- Makassar (2 charger)
('b1b2c3d4-0002-0001-0001-000000000014', 'a1b2c3d4-0001-0001-0001-000000000006', 'AC_TYPE2',  22.0, 'AVAILABLE', 'PLN-MKS-AC-001'),
('b1b2c3d4-0002-0001-0001-000000000015', 'a1b2c3d4-0001-0001-0001-000000000006', 'DC_CCS2',   50.0, 'AVAILABLE', 'PLN-MKS-DC-001'),
-- Surabaya (2 charger)
('b1b2c3d4-0002-0001-0001-000000000016', 'a1b2c3d4-0001-0001-0001-000000000007', 'AC_TYPE2',  22.0, 'AVAILABLE', 'PTM-SBY-AC-001'),
('b1b2c3d4-0002-0001-0001-000000000017', 'a1b2c3d4-0001-0001-0001-000000000007', 'DC_CCS2',   50.0, 'AVAILABLE', 'PTM-SBY-DC-001'),
-- Bandung (2 charger)
('b1b2c3d4-0002-0001-0001-000000000018', 'a1b2c3d4-0001-0001-0001-000000000008', 'AC_TYPE2',  22.0, 'AVAILABLE', 'PLN-BDG-AC-001'),
('b1b2c3d4-0002-0001-0001-000000000019', 'a1b2c3d4-0001-0001-0001-000000000008', 'DC_CCS2',   50.0, 'AVAILABLE', 'PLN-BDG-DC-001');

-- -------------------------------------------------------------------------
-- Data Slot Waktu (hari ini dan besok)
-- Setiap charger punya slot per 2 jam, harga bervariasi
-- -------------------------------------------------------------------------
INSERT INTO slots (charger_id, slot_date, start_time, end_time, status, price_per_kwh) VALUES
-- Charger AC Monas - hari ini
('b1b2c3d4-0002-0001-0001-000000000001', CURRENT_DATE, '06:00', '08:00', 'AVAILABLE', 2500),
('b1b2c3d4-0002-0001-0001-000000000001', CURRENT_DATE, '08:00', '10:00', 'AVAILABLE', 2500),
('b1b2c3d4-0002-0001-0001-000000000001', CURRENT_DATE, '10:00', '12:00', 'AVAILABLE', 3000),
('b1b2c3d4-0002-0001-0001-000000000001', CURRENT_DATE, '12:00', '14:00', 'AVAILABLE', 3000),
('b1b2c3d4-0002-0001-0001-000000000001', CURRENT_DATE, '14:00', '16:00', 'AVAILABLE', 3000),
('b1b2c3d4-0002-0001-0001-000000000001', CURRENT_DATE, '16:00', '18:00', 'AVAILABLE', 3500),
('b1b2c3d4-0002-0001-0001-000000000001', CURRENT_DATE, '18:00', '20:00', 'AVAILABLE', 3500),
('b1b2c3d4-0002-0001-0001-000000000001', CURRENT_DATE, '20:00', '22:00', 'AVAILABLE', 2500),
-- Charger DC CCS2 Monas - hari ini
('b1b2c3d4-0002-0001-0001-000000000002', CURRENT_DATE, '06:00', '08:00', 'AVAILABLE', 4000),
('b1b2c3d4-0002-0001-0001-000000000002', CURRENT_DATE, '08:00', '10:00', 'AVAILABLE', 4000),
('b1b2c3d4-0002-0001-0001-000000000002', CURRENT_DATE, '10:00', '12:00', 'AVAILABLE', 4500),
('b1b2c3d4-0002-0001-0001-000000000002', CURRENT_DATE, '12:00', '14:00', 'AVAILABLE', 4500),
('b1b2c3d4-0002-0001-0001-000000000002', CURRENT_DATE, '14:00', '16:00', 'AVAILABLE', 4500),
('b1b2c3d4-0002-0001-0001-000000000002', CURRENT_DATE, '16:00', '18:00', 'AVAILABLE', 5000),
('b1b2c3d4-0002-0001-0001-000000000002', CURRENT_DATE, '18:00', '20:00', 'AVAILABLE', 5000),
('b1b2c3d4-0002-0001-0001-000000000002', CURRENT_DATE, '20:00', '22:00', 'AVAILABLE', 4000),
-- Charger AC Kuningan - hari ini
('b1b2c3d4-0002-0001-0001-000000000004', CURRENT_DATE, '06:00', '08:00', 'AVAILABLE', 2500),
('b1b2c3d4-0002-0001-0001-000000000004', CURRENT_DATE, '08:00', '10:00', 'AVAILABLE', 2500),
('b1b2c3d4-0002-0001-0001-000000000004', CURRENT_DATE, '10:00', '12:00', 'AVAILABLE', 3000),
('b1b2c3d4-0002-0001-0001-000000000004', CURRENT_DATE, '12:00', '14:00', 'AVAILABLE', 3000),
('b1b2c3d4-0002-0001-0001-000000000004', CURRENT_DATE, '14:00', '16:00', 'AVAILABLE', 3000),
('b1b2c3d4-0002-0001-0001-000000000004', CURRENT_DATE, '16:00', '18:00', 'AVAILABLE', 3500),
('b1b2c3d4-0002-0001-0001-000000000004', CURRENT_DATE, '18:00', '20:00', 'AVAILABLE', 3500),
('b1b2c3d4-0002-0001-0001-000000000004', CURRENT_DATE, '20:00', '22:00', 'AVAILABLE', 2500),
-- Slot besok untuk Cikampek (contoh rest area)
('b1b2c3d4-0002-0001-0001-000000000006', CURRENT_DATE + 1, '06:00', '08:00', 'AVAILABLE', 2500),
('b1b2c3d4-0002-0001-0001-000000000006', CURRENT_DATE + 1, '08:00', '10:00', 'AVAILABLE', 2500),
('b1b2c3d4-0002-0001-0001-000000000006', CURRENT_DATE + 1, '10:00', '12:00', 'AVAILABLE', 3000),
('b1b2c3d4-0002-0001-0001-000000000006', CURRENT_DATE + 1, '12:00', '14:00', 'AVAILABLE', 3000),
('b1b2c3d4-0002-0001-0001-000000000007', CURRENT_DATE + 1, '06:00', '08:00', 'AVAILABLE', 4000),
('b1b2c3d4-0002-0001-0001-000000000007', CURRENT_DATE + 1, '08:00', '10:00', 'AVAILABLE', 4000),
('b1b2c3d4-0002-0001-0001-000000000007', CURRENT_DATE + 1, '10:00', '12:00', 'AVAILABLE', 4500),
('b1b2c3d4-0002-0001-0001-000000000007', CURRENT_DATE + 1, '12:00', '14:00', 'AVAILABLE', 4500);
