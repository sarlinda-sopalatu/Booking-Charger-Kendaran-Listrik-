# ADR-003 — Database per Service Pattern

| Field | Value |
|---|---|
| **ID** | ADR-003 |
| **Judul** | Database per Service Pattern |
| **Status** | Accepted |
| **Tanggal** | 2026-08-15 |
| **Pengusul** | Arsitek Sistem |
| **Pengambil Keputusan** | Seluruh Tim |

---

## Konteks

Dalam arsitektur microservices, harus diputuskan bagaimana setiap service mengakses data. Pilihan yang ada:
1. **Shared Database** — semua service berbagi satu database dan schema
2. **Database per Service** — setiap service punya database/schema sendiri
3. **Hybrid** — beberapa service berbagi database, beberapa tidak

Jenis database yang dipertimbangkan:
- PostgreSQL (relational, ACID)
- MongoDB (document, flexible schema)
- Redis (in-memory, key-value)

---

## Keputusan

**Dipilih: Database per Service**, dengan pemilihan jenis database sesuai kebutuhan domain:

| Service | Database | Tipe | Alasan |
|---|---|---|---|
| User Service | PostgreSQL | Relational | Data terstruktur, perlu ACID transactions, relasi antar tabel |
| Station Service | PostgreSQL | Relational | Data hierarkis (station → charger → slot), relasi yang jelas |
| Booking Service | PostgreSQL | Relational | Perlu strong consistency, ACID untuk status booking |
| Queue Service | Redis | In-memory | Low latency, sorted set untuk urutan antrian |
| Payment Service | PostgreSQL | Relational | Perlu ACID untuk transaksi keuangan, audit trail |
| Monitoring Service | MongoDB | Document | Time-series data, skema fleksibel per tipe charger, write-heavy |

---

## Alasan

### Mengapa TIDAK Shared Database

**Coupling pada level data**: jika Station Service mengubah skema tabel `slots`, Booking Service yang ikut akses tabel itu bisa rusak. Ini menghilangkan nilai utama microservices.

**Tidak bisa scale independently**: jika Monitoring Service perlu lebih banyak storage, tidak bisa di-scale tanpa memengaruhi database yang dipakai service lain.

**Tidak bisa pilih teknologi yang tepat**: terpaksa semua pakai satu jenis database meskipun kebutuhannya berbeda.

### Mengapa Database per Service

- **Loose coupling** antar service — tidak ada shared schema atau shared connection pool
- **Freedom of choice** — setiap service memilih database yang paling tepat untuk use case-nya
- **Independent scaling** — database Monitoring Service dapat di-scale terpisah
- **Fault isolation** — masalah pada database satu service tidak langsung memengaruhi service lain

### Pemilihan Database Berdasarkan Use Case

#### PostgreSQL untuk transactional data
- Users, Bookings, Payments butuh **ACID transactions**
- Data terstruktur dengan relasi yang jelas
- Query kompleks dengan JOIN diperlukan
- Strong consistency dibutuhkan

#### Redis untuk Queue Service
- Antrian butuh **operasi atomic yang sangat cepat** (sub-millisecond)
- `ZADD` / `ZRANK` / `ZPOPMIN` — primitive yang sempurna untuk sorted queue
- Data tidak perlu persisten jangka panjang (antrian biasanya selesai dalam jam)
- Pub/Sub bisa digunakan untuk notifikasi real-time

#### MongoDB untuk Monitoring Service
- Data sensor datang **sangat cepat** (setiap 10 detik per charger)
- Skema fleksibel — setiap tipe charger bisa punya field berbeda
- Time-series queries: "ambil data 1 jam terakhir untuk charger X"
- Write-heavy workload cocok dengan MongoDB architecture

---

## Strategi Data Consistency

Karena tidak ada shared database, consistency antar service dijaga dengan:

### Pattern: Eventual Consistency via Events
```
Booking Service (CREATE booking)
      │
      ▼
   RabbitMQ
      │
      ├─► Queue Service: update antrian
      ├─► Notification Service: kirim email
      └─► Payment Service: siapkan invoice
```

### Pattern: API Composition (untuk read)
```
Frontend butuh: booking + station info + user info

→ API Gateway memproxy ke Booking Service
→ Booking Service call Station Service (HTTP internal)
→ Booking Service call User Service (HTTP internal)
→ Booking Service aggregate response
```

### Pattern: Saga untuk distributed transaction
Booking + Slot Reservation:
1. Reserve slot di Station Service
2. Buat booking di Booking Service
3. Jika step 2 gagal → release slot di Station Service (compensating transaction)

---

## Schema Overview

### PostgreSQL — ev_users (schema)
```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    phone       VARCHAR(20),
    ev_plate    VARCHAR(20),
    role        VARCHAR(20) DEFAULT 'USER',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### PostgreSQL — ev_stations (schema)
```sql
CREATE TABLE stations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    address     TEXT NOT NULL,
    latitude    DECIMAL(10,8) NOT NULL,
    longitude   DECIMAL(11,8) NOT NULL,
    status      VARCHAR(20) DEFAULT 'ACTIVE',
    operator_id UUID,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chargers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id      UUID REFERENCES stations(id) ON DELETE CASCADE,
    connector_type  VARCHAR(20) NOT NULL, -- AC_TYPE2, DC_CCS2, CHAdeMO
    max_power_kw    DECIMAL(8,2) NOT NULL,
    status          VARCHAR(20) DEFAULT 'AVAILABLE',
    serial_number   VARCHAR(100) UNIQUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE slots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    charger_id  UUID REFERENCES chargers(id) ON DELETE CASCADE,
    slot_date   DATE NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    status      VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, RESERVED, OCCUPIED, MAINTENANCE
    price_per_kwh DECIMAL(10,2) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(charger_id, slot_date, start_time)
);
```

### Redis — Queue Structure
```
# Sorted set: queue per station per date
ZADD queue:STN001:2026-08-15  1723680000  USR001
ZADD queue:STN001:2026-08-15  1723680600  USR002

# Hash: detail antrian per user
HSET booking:queue:USR001  position 1  stationId STN001  joinedAt 1723680000
```

### MongoDB — charger_readings collection
```javascript
{
  _id: ObjectId("..."),
  charger_id: "CHR001",
  session_id: "SESS001",
  booking_id: "BK001",
  timestamp: ISODate("2026-08-15T10:30:00.000Z"),
  power_kw: 22.5,
  energy_kwh_delivered: 5.234,
  voltage_v: 220,
  current_a: 32,
  state_of_charge: 75,    // % baterai EV
  temperature_c: 38,
  connector_temp_c: 35
}
// Index: { charger_id: 1, timestamp: -1 }
// TTL index: expire data > 1 tahun
```

---

## Konsekuensi

### Positif
- Setiap service dapat dikembangkan dan di-scale secara independen
- Tidak ada shared schema → tidak ada deployment dependency
- Database dapat dipilih sesuai use case (SQL vs NoSQL vs in-memory)
- Fault isolation yang lebih baik

### Negatif
- **Tidak ada JOIN lintas service** → data yang dibutuhkan harus di-aggregate via API atau event
- **Eventual consistency** → data di service berbeda bisa sementara tidak konsisten
- **Duplikasi data** → beberapa data perlu di-replicate (misal: userId ada di semua service)
- **Operasional lebih kompleks** → perlu mengelola multiple database instances

### Mitigasi
- API composition untuk kebutuhan aggregate data di read-path
- Event sourcing untuk menjaga consistency di write-path
- Idempotency keys untuk mencegah duplikasi event processing
- Compensating transactions (Saga) untuk rollback distributed transactions
