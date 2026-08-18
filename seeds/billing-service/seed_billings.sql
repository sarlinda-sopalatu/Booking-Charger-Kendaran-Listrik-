-- =============================================================================
-- seeds/billing-service/seed_billings.sql
-- Data contoh: tagihan dan invoice untuk billing-service
-- Jalankan: psql -U ev_user -d ev_payments < seeds/billing-service/seed_billings.sql
-- =============================================================================

-- -------------------------------------------------------------------------
-- Data pembayaran (terkait booking di seed_bookings.sql)
-- -------------------------------------------------------------------------
INSERT INTO payments (id, booking_id, user_id, amount_idr, method, status, external_ref, completed_at, created_at) VALUES
(
  'e1b2c3d4-0005-0001-0001-000000000001',
  'd1b2c3d4-0004-0001-0001-000000000001',  -- Booking Budi Santoso (CONFIRMED)
  'c1b2c3d4-0003-0001-0001-000000000001',  -- Budi Santoso
  35000.00,   -- 2 jam x 7 kWh rata-rata x Rp2500/kWh + biaya admin
  'QRIS',
  'COMPLETED',
  'MIDTRANS-TRX-001',
  NOW() - INTERVAL '1 hour 50 minutes',
  NOW() - INTERVAL '2 hours'
),
(
  'e1b2c3d4-0005-0001-0001-000000000002',
  'd1b2c3d4-0004-0001-0001-000000000002',  -- Booking Siti Rahayu (PENDING_PAYMENT)
  'c1b2c3d4-0003-0001-0001-000000000002',  -- Siti Rahayu
  20000.00,
  'E_WALLET',
  'PENDING',
  NULL,
  NULL,
  NOW() - INTERVAL '30 minutes'
),
(
  'e1b2c3d4-0005-0001-0001-000000000003',
  'd1b2c3d4-0004-0001-0001-000000000003',  -- Booking Andi Wijaya DC (CONFIRMED)
  'c1b2c3d4-0003-0001-0001-000000000003',  -- Andi Wijaya
  75000.00,   -- DC fast charging lebih mahal
  'BANK_TRANSFER',
  'COMPLETED',
  'MIDTRANS-TRX-003',
  NOW() - INTERVAL '55 minutes',
  NOW() - INTERVAL '1 hour'
),
(
  'e1b2c3d4-0005-0001-0001-000000000004',
  'd1b2c3d4-0004-0001-0001-000000000004',  -- Booking Dewi Kusuma (CONFIRMED)
  'c1b2c3d4-0003-0001-0001-000000000004',  -- Dewi Kusuma
  50000.00,
  'QRIS',
  'COMPLETED',
  'MIDTRANS-TRX-004',
  NOW() - INTERVAL '10 minutes',
  NOW()
),
(
  'e1b2c3d4-0005-0001-0001-000000000005',
  'd1b2c3d4-0004-0001-0001-000000000005',  -- Booking Reza Pratama (CANCELLED)
  'c1b2c3d4-0003-0001-0001-000000000005',  -- Reza Pratama
  35000.00,
  'E_WALLET',
  'REFUNDED',
  'MIDTRANS-TRX-005',
  NULL,
  NOW() - INTERVAL '3 hours'
)
ON CONFLICT (booking_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- Data invoice (hanya untuk pembayaran yang COMPLETED)
-- -------------------------------------------------------------------------
INSERT INTO invoices (id, payment_id, invoice_number, items, subtotal_idr, tax_idr, total_idr, issued_at) VALUES
(
  'f1b2c3d4-0006-0001-0001-000000000001',
  'e1b2c3d4-0005-0001-0001-000000000001',
  'INV-2026-0001',
  '[{"description": "Pengisian AC 2 jam (Charger Monas)", "qty": 1, "unit_price": 32000, "subtotal": 32000}, {"description": "Biaya admin", "qty": 1, "unit_price": 3000, "subtotal": 3000}]',
  32000.00,
  3000.00,
  35000.00,
  NOW() - INTERVAL '1 hour 50 minutes'
),
(
  'f1b2c3d4-0006-0001-0001-000000000002',
  'e1b2c3d4-0005-0001-0001-000000000003',
  'INV-2026-0002',
  '[{"description": "Pengisian DC Fast Charge 2 jam (Charger DC Monas)", "qty": 1, "unit_price": 70000, "subtotal": 70000}, {"description": "Biaya admin", "qty": 1, "unit_price": 5000, "subtotal": 5000}]',
  70000.00,
  5000.00,
  75000.00,
  NOW() - INTERVAL '55 minutes'
),
(
  'f1b2c3d4-0006-0001-0001-000000000003',
  'e1b2c3d4-0005-0001-0001-000000000004',
  'INV-2026-0003',
  '[{"description": "Pengisian AC 2 jam (Charger DC Cikampek)", "qty": 1, "unit_price": 47000, "subtotal": 47000}, {"description": "Biaya admin", "qty": 1, "unit_price": 3000, "subtotal": 3000}]',
  47000.00,
  3000.00,
  50000.00,
  NOW() - INTERVAL '10 minutes'
)
ON CONFLICT (payment_id) DO NOTHING;
