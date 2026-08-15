# ADR-004 — Event-Driven Messaging dengan RabbitMQ

| Field | Value |
|---|---|
| **ID** | ADR-004 |
| **Judul** | Pemilihan Event-Driven Architecture & Message Broker |
| **Status** | Accepted |
| **Tanggal** | 2026-08-15 |
| **Pengusul** | Arsitek Sistem |
| **Pengambil Keputusan** | Seluruh Tim |

---

## Konteks

Dalam arsitektur microservices ini, banyak operasi bisnis bersifat cross-service:
- Booking dibuat → notifikasi dikirim, antrian diupdate
- Pembayaran selesai → booking diupdate, email invoice dikirim
- Slot pengisian selesai → invoice dihitung, notifikasi dikirim

Dua pilihan utama komunikasi antar service:
1. **Synchronous (REST/HTTP)** — caller menunggu respons
2. **Asynchronous (Message Broker)** — publisher fire-and-forget, consumer proses sendiri

Message broker yang dipertimbangkan:
- **RabbitMQ** — mature, AMQP protocol, plugin ecosystem kaya
- **Apache Kafka** — high-throughput, log-based, event streaming
- **Redis Pub/Sub** — simple, sudah digunakan untuk Queue Service
- **AWS SNS/SQS** — managed, cloud-native

---

## Keputusan

**Dipilih: RabbitMQ sebagai Message Broker utama**

Digunakan untuk semua komunikasi asinkron antar service. REST/HTTP tetap digunakan untuk komunikasi sinkron yang membutuhkan respons langsung.

---

## Alasan

### Mengapa RabbitMQ (bukan Kafka)

| Kriteria | RabbitMQ | Kafka |
|---|---|---|
| **Message routing** | Flexible (fanout, topic, direct, headers) | Topic-based saja |
| **Message TTL** | Built-in per queue/message | Tidak native |
| **Dead Letter Queue** | Built-in | Perlu konfigurasi manual |
| **Message acknowledgment** | Per-message | Offset-based |
| **Setup complexity** | Rendah | Tinggi (perlu Zookeeper/KRaft) |
| **Throughput** | 20-50K msg/s | 1M+ msg/s |
| **Use case** | Task queues, pub/sub | Event streaming, log aggregation |

**Kesimpulan**: RabbitMQ lebih cocok untuk use case ini. Kafka didesain untuk high-throughput event streaming yang belum dibutuhkan pada skala ini.

### Mengapa BUKAN Redis Pub/Sub
- Tidak ada message persistence — jika consumer down, message hilang
- Tidak ada acknowledgment mechanism
- Tidak ada Dead Letter Queue
- Tidak cocok untuk critical business events (payment, booking)

### Mengapa BUKAN AWS SNS/SQS
- Vendor lock-in
- Biaya ekstra
- Tidak cocok untuk deployment on-premise

---

## Event Catalog

### Exchange: `booking`
| Event | Routing Key | Publishers | Subscribers |
|---|---|---|---|
| `booking.created` | `booking.created` | Booking Service | Notification, Queue |
| `booking.cancelled` | `booking.cancelled` | Booking Service | Notification, Queue, Payment |
| `booking.status_changed` | `booking.status_changed` | Booking Service | Notification |
| `booking.confirmed` | `booking.confirmed` | Booking Service | Notification |

### Exchange: `payment`
| Event | Routing Key | Publishers | Subscribers |
|---|---|---|---|
| `payment.initiated` | `payment.initiated` | Payment Service | Notification |
| `payment.completed` | `payment.completed` | Payment Service | Notification, Booking |
| `payment.failed` | `payment.failed` | Payment Service | Notification, Booking |
| `payment.refunded` | `payment.refunded` | Payment Service | Notification |

### Exchange: `charger`
| Event | Routing Key | Publishers | Subscribers |
|---|---|---|---|
| `charger.session.started` | `charger.session.started` | Monitoring Service | Notification, Booking |
| `charger.session.ended` | `charger.session.ended` | Monitoring Service | Notification, Payment |
| `charger.alert` | `charger.alert` | Monitoring Service | Notification |
| `charger.offline` | `charger.offline` | Monitoring Service | Notification, Station |

### Exchange: `queue`
| Event | Routing Key | Publishers | Subscribers |
|---|---|---|---|
| `queue.slot.available` | `queue.slot.available` | Queue Service | Notification |
| `queue.user.notified` | `queue.user.notified` | Queue Service | Booking |

---

## Event Schema (Format)

Semua event mengikuti format standar:

```json
{
  "eventId": "evt_abc123xyz",
  "eventType": "booking.created",
  "timestamp": "2026-08-15T10:30:00.000Z",
  "version": "1.0",
  "source": "booking-service",
  "correlationId": "req_xyz789",
  "data": {
    // payload spesifik per event
  }
}
```

### Contoh: booking.created
```json
{
  "eventId": "evt_001",
  "eventType": "booking.created",
  "timestamp": "2026-08-15T10:30:00.000Z",
  "version": "1.0",
  "source": "booking-service",
  "correlationId": "req_abc123",
  "data": {
    "bookingId": "bk_001",
    "userId": "usr_001",
    "userEmail": "driver@email.com",
    "userName": "Budi Santoso",
    "slotId": "slot_001",
    "stationName": "Stasiun Sudirman",
    "chargerType": "DC_CCS2",
    "slotDate": "2026-08-15",
    "startTime": "14:00",
    "endTime": "16:00",
    "estimatedAmount": 75000,
    "expiresAt": "2026-08-15T11:00:00.000Z"
  }
}
```

---

## Topology RabbitMQ

```
Exchange: booking (topic)
├── Queue: booking-notification-queue
│   └── Binding: booking.*
│   └── Consumer: Notification Service
│
├── Queue: booking-queue-service-queue
│   └── Binding: booking.created, booking.cancelled
│   └── Consumer: Queue Service
│
└── Queue: booking-payment-queue
    └── Binding: booking.cancelled
    └── Consumer: Payment Service (untuk trigger refund)

Exchange: payment (topic)
├── Queue: payment-notification-queue
│   └── Binding: payment.*
│   └── Consumer: Notification Service
│
└── Queue: payment-booking-queue
    └── Binding: payment.completed, payment.failed
    └── Consumer: Booking Service

Exchange: charger (topic)
├── Queue: charger-notification-queue
│   └── Binding: charger.*
│   └── Consumer: Notification Service
│
└── Queue: charger-payment-queue
    └── Binding: charger.session.ended
    └── Consumer: Payment Service
```

---

## Dead Letter Queue (DLQ) Strategy

Jika consumer gagal memproses message:
1. Message di-NACK tanpa requeue → masuk ke DLQ
2. Setelah 3x retry (dengan exponential backoff), masuk ke DLQ final
3. DLQ dimonitoring dan di-alert ke tim ops
4. Message di DLQ bisa di-replay manual setelah root cause diperbaiki

```
Queue: booking-notification-queue
  DLQ: booking-notification-queue.dlq
  Max retries: 3
  Retry delay: 1s, 5s, 30s
```

---

## Konsekuensi

### Positif
- Service **decoupled** — publisher tidak tahu siapa consumernya
- **Reliable message delivery** dengan acknowledgment
- **Retry mechanism** built-in dengan DLQ
- **Fan-out** — satu event bisa di-consume banyak service
- **Buffering** — consumer bisa proses sesuai kapasitasnya

### Negatif
- **Eventual consistency** — consumer tidak langsung proses event
- **Debugging lebih sulit** — alur pesan tidak linear
- **Ordering tidak dijamin** di multiple consumer scenario
- **Infrastructure tambahan** — RabbitMQ harus dikelola

### Mitigasi
- Idempotency di setiap consumer (event bisa duplicate)
- Correlation ID untuk tracing lintas service
- RabbitMQ Management UI untuk monitoring queue
- DLQ monitoring dan alerting
