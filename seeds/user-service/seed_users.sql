-- =============================================================================
-- seeds/user-service/seed_users.sql
-- User seed EV Charging
-- Password: Password123!
-- =============================================================================

INSERT INTO users 
(id, email, password_hash, name, phone, ev_plate, role, created_at, updated_at) 
VALUES

(
'c1b2c3d4-0003-0001-0001-000000000001',
'budi.santoso@gmail.com',
'$2a$10$c7HHOEfjAi2oZWyLpfmYTORjs2s52zxdNtwjYCJaLDiooBT2rsADu',
'Budi Santoso',
'081234567001',
'B 1234 EV',
'USER',
NOW(),
NOW()
),

(
'c1b2c3d4-0003-0001-0001-000000000002',
'siti.rahayu@gmail.com',
'$2a$10$c7HHOEfjAi2oZWyLpfmYTORjs2s52zxdNtwjYCJaLDiooBT2rsADu',
'Siti Rahayu',
'081234567002',
'B 5678 EV',
'USER',
NOW(),
NOW()
),

(
'c1b2c3d4-0003-0001-0001-000000000003',
'andi.wijaya@gmail.com',
'$2a$10$c7HHOEfjAi2oZWyLpfmYTORjs2s52zxdNtwjYCJaLDiooBT2rsADu',
'Andi Wijaya',
'081234567003',
'D 9012 EV',
'USER',
NOW(),
NOW()
),

(
'c1b2c3d4-0003-0001-0001-000000000004',
'dewi.kusuma@gmail.com',
'$2a$10$c7HHOEfjAi2oZWyLpfmYTORjs2s52zxdNtwjYCJaLDiooBT2rsADu',
'Dewi Kusuma',
'081234567004',
'L 3456 EV',
'USER',
NOW(),
NOW()
),

(
'c1b2c3d4-0003-0001-0001-000000000005',
'reza.pratama@gmail.com',
'$2a$10$c7HHOEfjAi2oZWyLpfmYTORjs2s52zxdNtwjYCJaLDiooBT2rsADu',
'Reza Pratama',
'081234567005',
'B 7890 EV',
'USER',
NOW(),
NOW()
),

(
'c1b2c3d4-0003-0001-0001-000000000006',
'admin@ev-charging.id',
'$2a$10$c7HHOEfjAi2oZWyLpfmYTORjs2s52zxdNtwjYCJaLDiooBT2rsADu',
'Admin Sistem',
'081234567000',
NULL,
'ADMIN',
NOW(),
NOW()
),

(
'c1b2c3d4-0003-0001-0001-000000000007',
'operator.pln@ev-charging.id',
'$2a$10$c7HHOEfjAi2oZWyLpfmYTORjs2s52zxdNtwjYCJaLDiooBT2rsADu',
'Operator PLN',
'081234567099',
NULL,
'OPERATOR',
NOW(),
NOW()
);