# ARCHITECTURE.md — EV Charging Booking System

> **Dokumen oleh: Arsitek Sistem**  
> Versi: 1.0 | Tanggal: Agustus 2026

---

## 1. Pendahuluan

Dokumen ini menjelaskan keputusan arsitektur, prinsip desain, dan panduan teknis untuk sistem **Booking Charger Kendaraan Listrik**. Sistem ini dirancang menggunakan pola **Microservices** untuk memenuhi kebutuhan skalabilitas, ketersediaan tinggi, dan kemudahan pemeliharaan.

---

## 2. Prinsip Arsitektur

### 2.1 Design Principles

| Prinsip | Deskripsi |
|---|---|
| **Single Responsibility** | Setiap service menangani satu domain bisnis |
| **Loose Coupling** | Service berkomunikasi lewat API dan event, bukan shared database |
| **High Cohesion** | Kode yang terkait dikumpulkan dalam satu service |
| **Failure Isolation** | Kegagalan satu service tidak boleh merobohkan service lain |
| **Observability** | Setiap service menghasilkan log, metric, dan trace |
| **API First** | Kontrak API didefinisikan sebelum implementasi |
| **Infrastructure as Code** | Semua infrastruktur didefinisikan dalam kode (Docker Compose) |

### 2.2 Architectural Patterns

- **Microservices Architecture** — dekomposisi domain bisnis
- **API Gateway Pattern** — single entry point untuk semua client
- **Database per Service** — isolasi data antar service
- **Event-Driven Architecture** — komunikasi async via RabbitMQ
- **CQRS (Command Query Responsibility Segregation)** — di Monitoring Service
- **Saga Pattern** — untuk transaksi terdistribusi (booking + payment)
- **Circuit Breaker** — toleransi kegagalan antar service

---

## 3. Dekomposisi Domain (Domain-Driven Design)

### 3.1 Bounded Contexts

```
┌─────────────────────────────────────────────────────────────┐
│                    EV Charging System                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Identity │  │ Station  │  │ Booking  │  │  Payment   │  │
│  │ Context  │  │ Context  │  │ Context  │  │  Context   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────────┐ │
│  │  Queue   │  │Monitoring│  │    Notification Context    │ │
│  │ Context  │  │ Context  │  │                            │ │
│  └──────────┘  └──────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Domain Entities

**Identity Context** (User Service)
- `User` — akun pengguna (id, name, email, password_hash, role, phone, ev_plate)
- `Session` — JWT refresh token

**Station Context** (Station Service)
- `ChargingStation` — stasiun pengisian (id, name, address, lat, lng, status)
- `Charger` — unit pengisi daya (id, station_id, connector_type, max_power_kw, status)
- `Slot` — slot waktu (id, charger_id, start_time, end_time, status)

**Booking Context** (Booking Service)
- `Booking` — pemesanan (id, user_id, slot_id, status, created_at)
- `BookingEvent` — riwayat perubahan status booking

**Queue Context** (Queue Service)
- `QueueEntry` — posisi antrian (booking_id, station_id, position, joined_at)

**Payment Context** (Payment Service)
- `Payment` — transaksi pembayaran (id, booking_id, amount, method, status)
- `Invoice` — dokumen tagihan

**Monitoring Context** (Monitoring Service)
- `ChargerReading` — pembacaan sensor (charger_id, timestamp, power_kw, energy_kwh, voltage, current)
- `SessionMetric` — metrik sesi pengisian

---

## 4. Topology Jaringan

```
Internet
    │
    ▼
┌─────────────────────────────┐
│         Nginx               │  Port 80/443
│    (Reverse Proxy / SSL)    │
└──────────┬──────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
Frontend      API Gateway
:5173         :3000
(React SPA)   (JWT auth, routing)
                   │
       ┌───────────┼───────────────────┐
       ▼           ▼                   ▼
  User-Svc    Station-Svc         Booking-Svc
  :3001        :3002               :3003
  [PG-users]  [PG-stations]      [PG-bookings]
                                       │
                             ┌─────────┼──────────┐
                             ▼         ▼           ▼
                         Queue-Svc  Payment-Svc  Monitor-Svc
                         :3004       :3005        :3006
                        [Redis]    [PG-payments] [MongoDB]
                             │
                             ▼
                       RabbitMQ :5672
                             │
                             ▼
                     Notification-Svc
                         :3007
```

---

## 5. Komunikasi Antar Service

### 5.1 Synchronous (REST/HTTP)

Digunakan untuk operasi yang membutuhkan respons langsung:

| Caller | Callee | Endpoint | Alasan |
|---|---|---|---|
| API Gateway | Semua service | Semua route | Proxy routing |
| Booking Service | Station Service | GET /internal/slots/:id | Cek ketersediaan slot |
| Booking Service | User Service | GET /internal/users/:id | Validasi user |
| Payment Service | Booking Service | PUT /internal/bookings/:id/status | Update status setelah bayar |

### 5.2 Asynchronous (RabbitMQ Events)

Digunakan untuk operasi yang tidak perlu respons langsung:

| Publisher | Event | Subscriber | Tujuan |
|---|---|---|---|
| Booking Service | `booking.created` | Notification-Svc, Queue-Svc | Kirim konfirmasi, masukkan antrian |
| Booking Service | `booking.cancelled` | Notification-Svc, Queue-Svc, Payment-Svc | Notifikasi, update antrian, refund |
| Payment Service | `payment.completed` | Notification-Svc, Booking-Svc | Notifikasi sukses, update booking |
| Payment Service | `payment.failed` | Notification-Svc, Booking-Svc | Notifikasi gagal, batalkan booking |
| Monitoring Service | `charger.session.ended` | Payment-Svc, Notification-Svc | Hitung tagihan, notifikasi selesai |
| Queue Service | `queue.slot.available` | Notification-Svc | Notifikasi giliran user |

---

## 6. Keamanan

### 6.1 Authentication & Authorization

```
Client → API Gateway → [Verify JWT] → Service
                              ↓
                        JWT Payload:
                        {
                          sub: "user_id",
                          email: "user@email.com",
                          role: "USER|ADMIN",
                          iat: 1234567890,
                          exp: 1234567890
                        }
```

- **Access Token**: JWT RS256, expire 15 menit
- **Refresh Token**: Opaque token disimpan di Redis, expire 7 hari
- **Role-Based Access Control (RBAC)**: USER, ADMIN, OPERATOR

### 6.2 Security Headers (via API Gateway)

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000
```

### 6.3 Rate Limiting

| Endpoint | Limit |
|---|---|
| POST /auth/login | 5 req/menit per IP |
| POST /auth/register | 3 req/menit per IP |
| GET /monitoring/live/* | 10 koneksi WebSocket per user |
| Semua lainnya | 100 req/menit per user |

---

## 7. Observability

### 7.1 Logging Strategy

Setiap service menggunakan Winston dengan format JSON terstruktur:

```json
{
  "timestamp": "2026-08-15T10:30:00.000Z",
  "level": "info",
  "service": "booking-service",
  "traceId": "abc123",
  "userId": "usr_001",
  "message": "Booking created",
  "data": {
    "bookingId": "bk_001",
    "slotId": "slot_001"
  }
}
```

### 7.2 Health Checks

Setiap service mengexpose endpoint:
- `GET /health` — status service (up/down)
- `GET /health/ready` — service siap menerima traffic
- `GET /health/live` — service masih berjalan

### 7.3 Metrics

Metrik yang dikumpulkan per service:
- Request count per endpoint
- Response time (p50, p95, p99)
- Error rate
- Database connection pool utilization
- Queue depth (RabbitMQ)

---

## 8. Data Management

### 8.1 Database Schema Overview

**PostgreSQL — Users**
```sql
users: id, email, password_hash, name, phone, ev_plate, role, created_at
refresh_tokens: id, user_id, token_hash, expires_at, created_at
```

**PostgreSQL — Stations**
```sql
stations: id, name, address, latitude, longitude, status, operator_id
chargers: id, station_id, connector_type, max_power_kw, status, serial_number
slots: id, charger_id, date, start_time, end_time, status, price_per_kwh
```

**PostgreSQL — Bookings**
```sql
bookings: id, user_id, slot_id, status, notes, created_at, updated_at
booking_events: id, booking_id, event_type, data, created_at
```

**Redis — Queue**
```
ZADD queue:{station_id} {score:timestamp} {booking_id}
HSET booking:queue:{booking_id} position station_id joined_at
```

**PostgreSQL — Payments**
```sql
payments: id, booking_id, user_id, amount_idr, method, status, external_ref, created_at
invoices: id, payment_id, invoice_number, items, total, issued_at
```

**MongoDB — Monitoring**
```javascript
// Collection: charger_readings
{
  charger_id: "chr_001",
  session_id: "sess_001",
  timestamp: ISODate("2026-08-15T10:30:00Z"),
  power_kw: 22.5,
  energy_kwh: 5.2,
  voltage_v: 220,
  current_a: 32,
  state_of_charge: 75,
  temperature_c: 38
}
```

### 8.2 Data Consistency

- **Saga Pattern** untuk booking + payment (choreography-based)
- **Optimistic locking** untuk update slot status
- **Idempotency keys** untuk request pembayaran
- **Outbox pattern** untuk reliable event publishing

---

## 9. Deployment

### 9.1 Container Strategy

Setiap service dikemas dalam Docker image yang:
- Menggunakan multi-stage build untuk memperkecil ukuran
- Menjalankan proses sebagai non-root user
- Menggunakan `.dockerignore` untuk mengecualikan file development
- Health check didefinisikan di Dockerfile

### 9.2 Environment Configuration

```
development  → docker-compose.yml
production   → docker-compose.prod.yml + secrets management
```

---

*Dokumen ini dikelola oleh Arsitek Sistem dan harus diperbarui setiap ada perubahan keputusan arsitektur yang signifikan.*
