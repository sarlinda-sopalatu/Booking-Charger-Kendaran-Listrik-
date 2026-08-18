-- =============================================================================
-- seeds/payment-service/seed_payments.sql
-- Data contoh: transaksi pembayaran dan audit trail event
-- Jalankan: psql -U ev_user -d ev_payments < seeds/payment-service/seed_payments.sql
-- =============================================================================

-- -------------------------------------------------------------------------
-- Data transaksi pembayaran
-- -------------------------------------------------------------------------
INSERT INTO payments (id, booking_id, user_id, amount_idr, method, status, external_ref, completed_at, expires_at, created_at) VALUES
(
  'e1b2c3d4-0005-0001-0001-000000000001',
  'd1b2c3d4-0004-0001-0001-000000000001',  -- Booking Budi Santoso
  'c1b2c3d4-0003-0001-0001-000000000001',
  35000.00,
  'QRIS',
  'COMPLETED',
  'MIDTRANS-TRX-001',
  NOW() - INTERVAL '1 hour 50 minutes',
  NULL,
  NOW() - INTERVAL '2 hours'
),
(
  'e1b2c3d4-0005-0001-0001-000000000002',
  'd1b2c3d4-0004-0001-0001-000000000002',  -- Booking Siti Rahayu
  'c1b2c3d4-0003-0001-0001-000000000002',
  20000.00,
  'E_WALLET',
  'PENDING',
  NULL,
  NULL,
  NOW() + INTERVAL '15 minutes',  -- expires_at
  NOW() - INTERVAL '30 minutes'
),
(
  'e1b2c3d4-0005-0001-0001-000000000003',
  'd1b2c3d4-0004-0001-0001-000000000003',  -- Booking Andi Wijaya
  'c1b2c3d4-0003-0001-0001-000000000003',
  75000.00,
  'BANK_TRANSFER',
  'COMPLETED',
  'MIDTRANS-TRX-003',
  NOW() - INTERVAL '55 minutes',
  NULL,
  NOW() - INTERVAL '1 hour'
),
(
  'e1b2c3d4-0005-0001-0001-000000000004',
  'd1b2c3d4-0004-0001-0001-000000000004',  -- Booking Dewi Kusuma
  'c1b2c3d4-0003-0001-0001-000000000004',
  50000.00,
  'QRIS',
  'COMPLETED',
  'MIDTRANS-TRX-004',
  NOW() - INTERVAL '10 minutes',
  NULL,
  NOW() - INTERVAL '15 minutes'
),
(
  'e1b2c3d4-0005-0001-0001-000000000005',
  'd1b2c3d4-0004-0001-0001-000000000005',  -- Booking Reza Pratama (dibatalkan)
  'c1b2c3d4-0003-0001-0001-000000000005',
  35000.00,
  'E_WALLET',
  'REFUNDED',
  'MIDTRANS-TRX-005',
  NULL,
  NULL,
  NOW() - INTERVAL '3 hours'
)
ON CONFLICT (booking_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- Audit trail event setiap perubahan status pembayaran
-- -------------------------------------------------------------------------
INSERT INTO payment_events (payment_id, event_type, data, created_at) VALUES
-- Pembayaran 1: Budi Santoso
('e1b2c3d4-0005-0001-0001-000000000001', 'CREATED',    '{"method": "QRIS", "amount": 35000}', NOW() - INTERVAL '2 hours'),
('e1b2c3d4-0005-0001-0001-000000000001', 'PROCESSING', '{"qr_generated": true}',              NOW() - INTERVAL '2 hours'),
('e1b2c3d4-0005-0001-0001-000000000001', 'COMPLETED',  '{"external_ref": "MIDTRANS-TRX-001"}', NOW() - INTERVAL '1 hour 50 minutes'),

-- Pembayaran 2: Siti Rahayu (masih pending)
('e1b2c3d4-0005-0001-0001-000000000002', 'CREATED',    '{"method": "E_WALLET", "amount": 20000}', NOW() - INTERVAL '30 minutes'),

-- Pembayaran 3: Andi Wijaya
('e1b2c3d4-0005-0001-0001-000000000003', 'CREATED',    '{"method": "BANK_TRANSFER", "amount": 75000}', NOW() - INTERVAL '1 hour'),
('e1b2c3d4-0005-0001-0001-000000000003', 'PROCESSING', '{"va_number": "70012345678"}',                  NOW() - INTERVAL '1 hour'),
('e1b2c3d4-0005-0001-0001-000000000003', 'COMPLETED',  '{"external_ref": "MIDTRANS-TRX-003"}',          NOW() - INTERVAL '55 minutes'),

-- Pembayaran 4: Dewi Kusuma
('e1b2c3d4-0005-0001-0001-000000000004', 'CREATED',    '{"method": "QRIS", "amount": 50000}', NOW() - INTERVAL '15 minutes'),
('e1b2c3d4-0005-0001-0001-000000000004', 'PROCESSING', '{"qr_generated": true}',              NOW() - INTERVAL '15 minutes'),
('e1b2c3d4-0005-0001-0001-000000000004', 'COMPLETED',  '{"external_ref": "MIDTRANS-TRX-004"}', NOW() - INTERVAL '10 minutes'),

-- Pembayaran 5: Reza Pratama (refund karena booking dibatalkan)
('e1b2c3d4-0005-0001-0001-000000000005', 'CREATED',    '{"method": "E_WALLET", "amount": 35000}', NOW() - INTERVAL '3 hours'),
('e1b2c3d4-0005-0001-0001-000000000005', 'COMPLETED',  '{"external_ref": "MIDTRANS-TRX-005"}',    NOW() - INTERVAL '2 hours 50 minutes'),
('e1b2c3d4-0005-0001-0001-000000000005', 'REFUNDED',   '{"reason": "Booking dibatalkan oleh pengguna"}', NOW() - INTERVAL '2 hours');

-- -------------------------------------------------------------------------
-- Data refund untuk pembayaran Reza Pratama
-- -------------------------------------------------------------------------
INSERT INTO refunds (payment_id, amount_idr, reason, status, processed_at, created_at) VALUES
(
  'e1b2c3d4-0005-0001-0001-000000000005',
  35000.00,
  'Booking dibatalkan oleh pengguna',
  'COMPLETED',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
);
