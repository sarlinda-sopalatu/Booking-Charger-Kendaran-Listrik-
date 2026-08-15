# 04 — Sequence Diagrams

> Diagram urutan untuk alur bisnis utama dalam sistem EV Charging Booking.

---

## 4.1 Alur Registrasi & Login

```mermaid
sequenceDiagram
    actor Driver
    participant FE as Frontend
    participant GW as API Gateway
    participant US as User Service
    participant PG as PostgreSQL (Users)

    Driver->>FE: Isi form registrasi
    FE->>GW: POST /api/auth/register
    GW->>GW: Rate limit check
    GW->>US: Forward request
    US->>US: Validasi input (Joi)
    US->>PG: SELECT email (cek duplikat)
    PG-->>US: Not found
    US->>US: bcrypt.hash(password)
    US->>PG: INSERT INTO users
    PG-->>US: User created
    US->>US: Generate JWT access + refresh token
    US->>PG: INSERT INTO refresh_tokens
    US-->>GW: 201 { user, accessToken, refreshToken }
    GW-->>FE: 201 response
    FE-->>Driver: Tampil pesan sukses, redirect dashboard
```

---

## 4.2 Alur Mencari & Memilih Stasiun

```mermaid
sequenceDiagram
    actor Driver
    participant FE as Frontend
    participant GW as API Gateway
    participant SS as Station Service
    participant PG as PostgreSQL (Stations)

    Driver->>FE: Buka halaman pencarian stasiun
    FE->>GW: GET /api/stations?lat=...&lng=...&radius=5km
    GW->>GW: Verify JWT token
    GW->>SS: Forward request
    SS->>PG: SELECT stations WHERE (lokasi dalam radius)
    PG-->>SS: List stasiun + info charger
    SS-->>GW: 200 { stations: [...] }
    GW-->>FE: Response
    FE-->>Driver: Tampil peta + list stasiun

    Driver->>FE: Pilih stasiun tertentu
    FE->>GW: GET /api/stations/:id/slots?date=2026-08-15
    GW->>SS: Forward request
    SS->>PG: SELECT slots WHERE charger_id IN (...) AND date = ...
    PG-->>SS: List slot dengan status
    SS-->>GW: 200 { slots: [...] }
    GW-->>FE: Response
    FE-->>Driver: Tampil grid slot tersedia
```

---

## 4.3 Alur Booking Slot (Happy Path)

```mermaid
sequenceDiagram
    actor Driver
    participant FE as Frontend
    participant GW as API Gateway
    participant BS as Booking Service
    participant SS as Station Service
    participant US as User Service
    participant PG_B as PostgreSQL (Bookings)
    participant PG_S as PostgreSQL (Stations)
    participant RMQ as RabbitMQ
    participant NS as Notification Service
    participant QS as Queue Service

    Driver->>FE: Pilih slot & klik "Pesan"
    FE->>GW: POST /api/bookings { slotId, notes }
    GW->>GW: Verify JWT → extract userId
    GW->>BS: Forward request + userId

    Note over BS: Saga: Step 1 — Validasi User
    BS->>US: GET /internal/users/:userId
    US-->>BS: 200 { user data }

    Note over BS: Saga: Step 2 — Cek & Reserve Slot
    BS->>SS: PUT /internal/slots/:slotId/reserve
    SS->>PG_S: UPDATE slots SET status='RESERVED' WHERE id=:slotId AND status='AVAILABLE'
    alt Slot masih tersedia
        PG_S-->>SS: 1 row updated
        SS-->>BS: 200 { slot reserved }

        Note over BS: Saga: Step 3 — Buat Booking Record
        BS->>PG_B: INSERT INTO bookings { userId, slotId, status: 'PENDING_PAYMENT' }
        PG_B-->>BS: Booking created
        BS->>PG_B: INSERT INTO booking_events { type: 'CREATED' }

        Note over BS: Saga: Step 4 — Publish Event
        BS->>RMQ: Publish booking.created { bookingId, userId, slotId, amount }
        BS-->>GW: 201 { booking }
        GW-->>FE: 201 response
        FE-->>Driver: Tampil halaman konfirmasi booking

        par Async Processing
            RMQ->>NS: booking.created event
            NS->>Driver: Email konfirmasi booking
        and
            RMQ->>QS: booking.created event
            QS->>QS: Cek apakah perlu masuk antrian (tidak, slot sudah direservasi)
        end

    else Slot sudah tidak tersedia
        PG_S-->>SS: 0 rows updated
        SS-->>BS: 409 Conflict
        BS-->>GW: 409 { slot tidak tersedia }
        GW-->>FE: 409 response
        FE-->>Driver: Tampil pilihan: "Slot penuh, mau antri?"
    end
```

---

## 4.4 Alur Bergabung Antrian

```mermaid
sequenceDiagram
    actor Driver
    participant FE as Frontend
    participant GW as API Gateway
    participant QS as Queue Service
    participant Redis as Redis
    participant RMQ as RabbitMQ
    participant NS as Notification Service

    Driver->>FE: Klik "Bergabung Antrian"
    FE->>GW: POST /api/queue/join { stationId, slotDate, slotTime }
    GW->>GW: Verify JWT
    GW->>QS: Forward request

    QS->>Redis: ZADD queue:{stationId}:{date} {timestamp} {userId}
    Redis-->>QS: Position in queue
    QS->>Redis: HSET booking:queue:{userId} { position, stationId, joinedAt }
    QS-->>GW: 200 { position: 3, estimatedWait: "45 menit" }
    GW-->>FE: Response
    FE-->>Driver: Tampil posisi antrian

    Note over QS,Redis: Background: Slot Watcher berjalan setiap 30 detik

    loop Setiap 30 detik
        QS->>QS: Cek apakah ada slot baru tersedia di setiap stasiun
        alt Ada slot tersedia
            QS->>Redis: ZPOPMIN queue:{stationId}:{date} (ambil yang paling lama)
            Redis-->>QS: userId di posisi pertama
            QS->>RMQ: Publish queue.slot.available { userId, stationId }
            RMQ->>NS: Event diterima
            NS->>Driver: SMS/Push "Giliran Anda! Slot tersedia 15 menit lagi"
        end
    end
```

---

## 4.5 Alur Pembayaran

```mermaid
sequenceDiagram
    actor Driver
    participant FE as Frontend
    participant GW as API Gateway
    participant PS as Payment Service
    participant BS as Booking Service
    participant PG_P as PostgreSQL (Payments)
    participant Midtrans as Midtrans Gateway
    participant RMQ as RabbitMQ
    participant NS as Notification Service

    Driver->>FE: Pilih metode bayar (QRIS) & klik "Bayar"
    FE->>GW: POST /api/payments/initiate { bookingId, method: "QRIS" }
    GW->>GW: Verify JWT
    GW->>PS: Forward request

    PS->>PS: Cek idempotency (Redis) — sudah ada transaksi untuk bookingId ini?
    alt Belum ada transaksi
        PS->>PG_P: INSERT INTO payments { bookingId, amount, method, status: 'PENDING' }
        PS->>Midtrans: POST /v2/charge { order_id, amount, payment_type: "qris" }
        Midtrans-->>PS: { transaction_id, qr_string, expire_time }
        PS->>PG_P: UPDATE payments SET external_ref=transaction_id
        PS-->>GW: 200 { paymentId, qrString, expiresAt }
        GW-->>FE: Response
        FE-->>Driver: Tampil QR Code untuk di-scan

        Note over Driver,Midtrans: Driver scan QR di aplikasi bank/e-wallet

        Midtrans->>PS: POST /webhook/payment { transaction_id, status: "settlement" }
        PS->>PS: Verifikasi signature webhook
        PS->>PG_P: UPDATE payments SET status='COMPLETED'
        PS->>PS: Generate invoice number
        PS->>PG_P: INSERT INTO invoices { paymentId, items, total }
        PS->>RMQ: Publish payment.completed { bookingId, paymentId, userId }
        PS-->>Midtrans: 200 OK

        par Async Processing
            RMQ->>NS: payment.completed event
            NS->>Driver: Email invoice + konfirmasi pembayaran
        and
            RMQ->>BS: payment.completed event
            BS->>BS: UPDATE bookings SET status='CONFIRMED'
        end

        Driver->>FE: Cek status pembayaran
        FE->>GW: GET /api/payments/:paymentId
        GW->>PS: Forward
        PS-->>GW: 200 { status: 'COMPLETED', invoice: {...} }
        GW-->>FE: Response
        FE-->>Driver: Tampil konfirmasi pembayaran berhasil

    else Sudah ada transaksi pending
        PS-->>GW: 200 { paymentId, qrString (existing) }
        GW-->>FE: Re-tampil QR yang sama
    end
```

---

## 4.6 Alur Real-time Monitoring Pengisian Daya

```mermaid
sequenceDiagram
    actor Driver
    participant FE as Frontend
    participant GW as API Gateway
    participant MS as Monitoring Service
    participant MongoDB as MongoDB
    participant HW as Charging Hardware (OCPP)
    participant RMQ as RabbitMQ
    participant NS as Notification Service

    Note over HW,MS: Hardware sudah terkoneksi via OCPP WebSocket

    Driver->>FE: Buka halaman monitoring (setelah booking confirmed)
    FE->>GW: GET /api/monitoring/charger/:chargerId
    GW->>MS: Forward
    MS->>MongoDB: Ambil data terbaru (last reading + active session)
    MongoDB-->>MS: { power_kw, energy_kwh, soc, voltage, current }
    MS-->>GW: 200 { currentReading, session }
    GW-->>FE: Response
    FE-->>Driver: Tampil dashboard monitoring

    FE->>MS: WebSocket connect ws://monitor/live/:chargerId
    MS-->>FE: Connected

    loop Setiap 10 detik (dari hardware)
        HW->>MS: OCPP MeterValues { chargerId, power_kw, energy_kwh, soc, voltage, current, temp }
        MS->>MS: Validasi dan proses data
        MS->>MongoDB: INSERT charger_readings { ...data, timestamp }
        MS->>FE: WebSocket emit 'reading' { power_kw: 22.5, soc: 75, energy_kwh: 5.2, eta_minutes: 30 }
        FE-->>Driver: Update grafik real-time

        MS->>MS: Alert engine: Cek anomali
        alt Deteksi anomali (e.g., suhu > 60°C)
            MS->>RMQ: Publish charger.alert { chargerId, type: 'OVERHEAT', value: 65 }
            RMQ->>NS: Alert event
            NS->>Driver: SMS "Peringatan: Suhu charger tinggi"
        end
    end

    Note over HW,MS: Pengisian selesai (SoC = 100% atau waktu slot habis)
    HW->>MS: OCPP StopTransaction { chargerId, energy_total, reason: 'EVDisconnected' }
    MS->>MongoDB: UPDATE session status='COMPLETED', end_time=now()
    MS->>RMQ: Publish charger.session.ended { chargerId, bookingId, energy_total, duration }
    MS->>FE: WebSocket emit 'session_ended' { energyUsed: 22.5, duration: 120, cost: 45000 }
    FE-->>Driver: Tampil ringkasan pengisian selesai

    RMQ->>NS: charger.session.ended event
    NS->>Driver: Email ringkasan pengisian + link invoice
```

---

## 4.7 Alur Pembatalan Booking

```mermaid
sequenceDiagram
    actor Driver
    participant FE as Frontend
    participant GW as API Gateway
    participant BS as Booking Service
    participant SS as Station Service
    participant PS as Payment Service
    participant PG_B as PostgreSQL (Bookings)
    participant RMQ as RabbitMQ
    participant NS as Notification Service
    participant QS as Queue Service

    Driver->>FE: Klik "Batalkan Booking"
    FE->>GW: PUT /api/bookings/:id/cancel
    GW->>GW: Verify JWT
    GW->>BS: Forward

    BS->>PG_B: SELECT booking WHERE id=:id AND user_id=:userId
    PG_B-->>BS: Booking data
    BS->>BS: Cek apakah masih bisa dibatalkan (status bukan CHARGING/COMPLETED)
    BS->>BS: Cek batas waktu pembatalan (> 1 jam sebelum slot)

    alt Bisa dibatalkan
        BS->>PG_B: UPDATE bookings SET status='CANCELLED'
        BS->>PG_B: INSERT booking_events { type: 'CANCELLED' }
        BS->>SS: PUT /internal/slots/:slotId/release
        SS->>SS: UPDATE slots SET status='AVAILABLE'
        SS-->>BS: 200 OK
        BS->>RMQ: Publish booking.cancelled { bookingId, userId, slotId, wasPaymentMade }

        par Async Processing
            RMQ->>NS: booking.cancelled event
            NS->>Driver: Email konfirmasi pembatalan
        and
            RMQ->>QS: booking.cancelled event
            QS->>QS: Cek antrian, notifikasi user berikutnya
        and
            alt Pembayaran sudah dilakukan
                RMQ->>PS: booking.cancelled event
                PS->>PS: Inisiasi refund ke payment gateway
                PS->>RMQ: Publish payment.refunded event
            end
        end

        BS-->>GW: 200 { message: "Booking berhasil dibatalkan" }
        GW-->>FE: Response
        FE-->>Driver: Tampil konfirmasi pembatalan + info refund

    else Tidak bisa dibatalkan
        BS-->>GW: 400 { error: "Booking tidak dapat dibatalkan" }
        GW-->>FE: 400 response
        FE-->>Driver: Tampil pesan error
    end
```
