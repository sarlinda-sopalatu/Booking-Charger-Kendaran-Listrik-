-- =============================================================================
-- seeds/booking-service/seed_bookings.sql
-- Data contoh: Booking slot charger
-- Jalankan: psql -U ev_user -d ev_bookings < seeds/booking-service/seed_bookings.sql
-- =============================================================================

INSERT INTO bookings (id, user_id, slot_id, rentang, status, notes, idempotency_key, created_at) VALUES
(
  'd1b2c3d4-0004-0001-0001-000000000001',
  'c1b2c3d4-0003-0001-0001-000000000001',  -- Budi Santoso
  'b1b2c3d4-0002-0001-0001-000000000001',  -- Charger AC Monas
  tstzrange(NOW()::date + '08:00'::time, NOW()::date + '10:00'::time),
  'CONFIRMED',
  'Butuh pengisian cepat sebelum meeting',
  'idem-key-001',
  NOW() - INTERVAL '2 hours'
),
(
  'd1b2c3d4-0004-0001-0001-000000000002',
  'c1b2c3d4-0003-0001-0001-000000000002',  -- Siti Rahayu
  'b1b2c3d4-0002-0001-0001-000000000004',  -- Charger AC Kuningan
  tstzrange(NOW()::date + '10:00'::time, NOW()::date + '12:00'::time),
  'PENDING_PAYMENT',
  NULL,
  'idem-key-002',
  NOW() - INTERVAL '30 minutes'
),
(
  'd1b2c3d4-0004-0001-0001-000000000003',
  'c1b2c3d4-0003-0001-0001-000000000003',  -- Andi Wijaya
  'b1b2c3d4-0002-0001-0001-000000000002',  -- Charger DC Monas
  tstzrange(NOW()::date + '14:00'::time, NOW()::date + '16:00'::time),
  'CONFIRMED',
  'DC fast charging',
  'idem-key-003',
  NOW() - INTERVAL '1 hour'
),
(
  'd1b2c3d4-0004-0001-0001-000000000004',
  'c1b2c3d4-0003-0001-0001-000000000004',  -- Dewi Kusuma
  'b1b2c3d4-0002-0001-0001-000000000007',  -- Charger DC Cikampek
  tstzrange((NOW()::date + 1) + '08:00'::time, (NOW()::date + 1) + '10:00'::time),
  'CONFIRMED',
  'Perjalanan Bandung besok',
  'idem-key-004',
  NOW()
),
(
  'd1b2c3d4-0004-0001-0001-000000000005',
  'c1b2c3d4-0003-0001-0001-000000000005',  -- Reza Pratama
  'b1b2c3d4-0002-0001-0001-000000000001',  -- Charger AC Monas
  tstzrange(NOW()::date + '20:00'::time, NOW()::date + '22:00'::time),
  'CANCELLED',
  NULL,
  'idem-key-005',
  NOW() - INTERVAL '3 hours'
);

-- Log event untuk setiap booking
INSERT INTO booking_events (booking_id, event_type, data, created_at) VALUES
('d1b2c3d4-0004-0001-0001-000000000001', 'CREATED',   '{"slotId": "b1b2c3d4-0002-0001-0001-000000000001"}', NOW() - INTERVAL '2 hours'),
('d1b2c3d4-0004-0001-0001-000000000001', 'CONFIRMED',  '{"paymentId": "pay-001"}', NOW() - INTERVAL '1 hour 50 minutes'),
('d1b2c3d4-0004-0001-0001-000000000002', 'CREATED',   '{"slotId": "b1b2c3d4-0002-0001-0001-000000000004"}', NOW() - INTERVAL '30 minutes'),
('d1b2c3d4-0004-0001-0001-000000000003', 'CREATED',   '{"slotId": "b1b2c3d4-0002-0001-0001-000000000002"}', NOW() - INTERVAL '1 hour'),
('d1b2c3d4-0004-0001-0001-000000000003', 'CONFIRMED',  '{"paymentId": "pay-003"}', NOW() - INTERVAL '55 minutes'),
('d1b2c3d4-0004-0001-0001-000000000004', 'CREATED',   '{"slotId": "b1b2c3d4-0002-0001-0001-000000000007"}', NOW()),
('d1b2c3d4-0004-0001-0001-000000000005', 'CREATED',   '{"slotId": "b1b2c3d4-0002-0001-0001-000000000001"}', NOW() - INTERVAL '3 hours'),
('d1b2c3d4-0004-0001-0001-000000000005', 'CANCELLED',  '{"reason": "Berubah rencana"}', NOW() - INTERVAL '2 hours');
