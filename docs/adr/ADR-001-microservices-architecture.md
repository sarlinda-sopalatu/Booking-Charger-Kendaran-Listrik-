# ADR-001 — Pemilihan Arsitektur Microservices

| Field | Value |
|---|---|
| **ID** | ADR-001 |
| **Judul** | Pemilihan Arsitektur Microservices |
| **Status** | Accepted |
| **Tanggal** | 2026-08-15 |
| **Pengusul** | Arsitek Sistem |
| **Pengambil Keputusan** | Seluruh Tim |

---

## Konteks

Sistem Booking Charger Kendaraan Listrik harus mampu menangani:
- Ribuan pengguna simultan (terutama di jam sibuk pagi dan sore)
- Multiple domain bisnis yang independen: booking, antrian, pembayaran, monitoring
- Tim pengembang yang terbagi per domain
- Kebutuhan skalabilitas berbeda-beda per komponen (monitoring butuh lebih banyak resource daripada user management)
- Real-time data telemetri dari hardware charger

Pilihan arsitektur yang dipertimbangkan:
1. **Monolithic Architecture** — satu aplikasi, satu database
2. **Microservices Architecture** — multiple service independen, database terpisah
3. **Modular Monolith** — satu aplikasi dengan modul terpisah, bisa di-extract kemudian

---

## Keputusan

**Dipilih: Microservices Architecture**

Sistem akan dibangun sebagai kumpulan service kecil yang independen, masing-masing bertanggung jawab atas satu domain bisnis:
- User Service
- Station Service
- Booking Service
- Queue Service
- Payment Service
- Monitoring Service
- Notification Service

---

## Alasan (Rationale)

### Mengapa BUKAN Monolith
- **Coupling tinggi**: perubahan di modul pembayaran bisa memengaruhi modul booking
- **Sulit scale secara selektif**: monitoring service butuh resource besar (time-series data) tapi user service tidak
- **Single point of failure**: jika modul satu crash, seluruh aplikasi down
- **Bottleneck deployment**: update satu fitur memerlukan deploy ulang seluruh aplikasi

### Mengapa Microservices
- **Isolation of failure**: kegagalan Notification Service tidak memengaruhi proses booking
- **Independent deployment**: update Payment Service tidak perlu restart Booking Service
- **Technology flexibility**: Monitoring Service bisa pakai MongoDB (time-series), yang lain pakai PostgreSQL
- **Team autonomy**: setiap tim bisa develop, test, dan deploy service mereka secara mandiri
- **Selective scaling**: Scale hanya Monitoring Service saat ada banyak charger aktif

### Trade-off yang Diterima
- **Kompleksitas operasional lebih tinggi** — diatasi dengan Docker Compose dan health checks
- **Latency jaringan antar service** — diminimalisir dengan internal network dan connection pooling
- **Distributed transaction complexity** — diatasi dengan Saga pattern (ADR-004)
- **Data consistency eventual** — diterima untuk domain non-kritis (notifikasi, monitoring historis)

---

## Konsekuensi

### Positif
- Setiap service dapat di-scale secara independen
- Kegagalan terisolasi per service
- Tim dapat bekerja secara paralel
- Teknologi dapat dipilih sesuai kebutuhan per service

### Negatif
- Membutuhkan infrastruktur lebih kompleks (API Gateway, Message Broker, multiple databases)
- Testing end-to-end lebih kompleks
- Debugging lintas service membutuhkan distributed tracing
- Operational overhead lebih besar

### Mitigasi
- Gunakan Docker Compose untuk simplifikasi development
- Implementasikan health check di semua service
- Standardisasi logging format untuk kemudahan debugging
- Dokumentasikan semua inter-service contracts dengan OpenAPI
