-- Runtime-compatible minimal seed for station-service schema

INSERT INTO stations (
  id, name, address, latitude, longitude, status, phone, opening_hours, facilities, created_at, updated_at
) VALUES (
  'a1b2c3d4-1000-0001-0001-000000000001',
  'SPKLU Demo Monas',
  'Jl. Medan Merdeka Barat, Gambir, Jakarta Pusat',
  -6.1754,
  106.8272,
  'ACTIVE',
  '(021) 123-4001',
  '24/7',
  '["parking", "toilet", "wifi"]'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO chargers (
  id, station_id, connector_type, max_power_kw, status, serial_number, created_at, updated_at
) VALUES (
  'b1b2c3d4-2000-0001-0001-000000000001',
  'a1b2c3d4-1000-0001-0001-000000000001',
  'AC_TYPE2',
  22.0,
  'AVAILABLE',
  'DEMO-MON-AC-001',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO slots (
  id, charger_id, slot_date, start_time, end_time, status, price_per_kwh, created_at, updated_at
) VALUES
(
  'c1b2c3d4-3000-0001-0001-000000000001',
  'b1b2c3d4-2000-0001-0001-000000000001',
  CURRENT_DATE,
  '16:00',
  '18:00',
  'AVAILABLE',
  3000,
  NOW(),
  NOW()
),
(
  'c1b2c3d4-3000-0001-0001-000000000002',
  'b1b2c3d4-2000-0001-0001-000000000001',
  CURRENT_DATE,
  '18:00',
  '20:00',
  'AVAILABLE',
  3000,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
