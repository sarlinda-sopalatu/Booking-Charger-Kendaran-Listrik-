-- =============================================================================
-- seeds/user-service/seed_users.sql
-- Data contoh: User pengguna sistem booking charger EV
-- Password semua user: "Password123!" (sudah di-hash dengan bcrypt)
-- Jalankan: psql -U ev_user -d ev_users < seeds/user-service/seed_users.sql
-- =============================================================================

INSERT INTO users (id, email, password_hash, name, phone, ev_plate, role, created_at) VALUES
(
  'c1b2c3d4-0003-0001-0001-000000000001',
  'budi.santoso@gmail.com',
  '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'Budi Santoso',
  '081234567001',
  'B 1234 EV',   -- Hyundai Ioniq 5
  'USER',
  NOW()
),
(
  'c1b2c3d4-0003-0001-0001-000000000002',
  'siti.rahayu@gmail.com',
  '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'Siti Rahayu',
  '081234567002',
  'B 5678 EV',   -- Wuling Air EV
  'USER',
  NOW()
),
(
  'c1b2c3d4-0003-0001-0001-000000000003',
  'andi.wijaya@gmail.com',
  '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'Andi Wijaya',
  '081234567003',
  'D 9012 EV',   -- BYD Atto 3
  'USER',
  NOW()
),
(
  'c1b2c3d4-0003-0001-0001-000000000004',
  'dewi.kusuma@gmail.com',
  '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'Dewi Kusuma',
  '081234567004',
  'L 3456 EV',   -- Tesla Model 3
  'USER',
  NOW()
),
(
  'c1b2c3d4-0003-0001-0001-000000000005',
  'reza.pratama@gmail.com',
  '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'Reza Pratama',
  '081234567005',
  'B 7890 EV',   -- Hyundai Kona Electric
  'USER',
  NOW()
),
(
  'c1b2c3d4-0003-0001-0001-000000000006',
  'admin@ev-charging.id',
  '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'Admin Sistem',
  '081234567000',
  NULL,
  'ADMIN',
  NOW()
),
(
  'c1b2c3d4-0003-0001-0001-000000000007',
  'operator.pln@ev-charging.id',
  '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'Operator PLN',
  '081234567099',
  NULL,
  'OPERATOR',
  NOW()
);
