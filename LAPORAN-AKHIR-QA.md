# Laporan Akhir — QA Engineer

**Proyek:** EV Charging Booking System (Microservices)
**Peran:** QA Engineer — *Pengujian, load test, AI-LOG, README, dan laporan akhir*
**Tanggal:** 22 Agustus 2026

Lihat juga: [`AI-LOG.md`](AI-LOG.md) (catatan proses & penggunaan AI) dan
[`load-test/README.md`](load-test/README.md) (detail skenario & threshold load test).

---

## 1. Ringkasan Eksekutif

Pengujian difokuskan pada **8 dari 9 komponen backend** (7 microservice inti +
API Gateway; `notification-service` dan `monitoring-service` belum memiliki
test — lihat §6). Hasilnya:

- **65 unit/integration test ditulis dan seluruhnya lulus** (dijalankan
  nyata dengan `jest`/`supertest`, bukan estimasi).
- **1 bug kritis ditemukan dan diperbaiki**: 4 service akan gagal start
  karena mengimpor modul yang tidak ada (`messaging/publisher.js` hilang).
- **2 ketidaksesuaian dokumentasi API ditemukan dan diperbaiki** di README
  (endpoint antrian & pembayaran yang didokumentasikan tidak cocok dengan
  route sesungguhnya).
- **1 load test suite (k6)** dibuat untuk 4 skenario beban (smoke/load/stress/
  spike), mencakup alur inti end-to-end lewat API Gateway. **Belum dieksekusi
  terhadap stack hidup** — lihat keterbatasan lingkungan di §5.
- Analisis kode mengidentifikasi **beberapa risiko performa & keandalan**
  yang perlu perhatian sebelum go-live (§4).

Kesimpulan singkat: **logika bisnis inti (booking saga, auth, billing,
payment, queue) terverifikasi benar pada level unit**, tapi proyek ini
**belum siap dianggap lulus QA end-to-end** sampai (a) load test benar-benar
dijalankan terhadap stack hidup, dan (b) rekomendasi di §6 ditindaklanjuti.

---

## 2. Ruang Lingkup & Metodologi

### 2.1 Yang diuji

| Service | Jenis test | Jumlah test | Fokus |
|---|---|---|---|
| `user-service` | Unit | 11 | Register, login, refresh token, logout, sanitasi data sensitif |
| `booking-service` | Unit | 11 | Saga pembuatan booking (4 langkah), compensating transaction, pembatalan |
| `billing-service` | Unit | 7 | Perhitungan subtotal/PPN/total, idempotensi, keyset pagination |
| `queue-service` | Unit | 6 | FIFO antrian, idempotensi join, posisi & estimasi tunggu |
| `payment-service` | Unit | 6 | Idempotensi pembayaran, validasi status booking, simulasi gateway |
| `station-service` | Integration (supertest) | 8 | Filter radius (Haversine), otorisasi role, validasi input (Joi) |
| `api-gateway` | Unit | 6 | Verifikasi JWT (valid/expired/invalid signature/audience salah) |
| `session-service` | Unit | 10 | Start/stop sesi, idempotensi, perhitungan kWh & biaya, transaksi DB |
| **Total** | | **65** | |

### 2.2 Pendekatan

Karena lingkungan pengerjaan (sandbox) **tidak memiliki akses ke
PostgreSQL, Redis, MongoDB, atau RabbitMQ sungguhan**, seluruh test ditulis
sebagai **unit/integration test dengan mock** pada boundary I/O:

- Model Sequelize (`Model.create`, `.findOne`, dst.) di-mock dengan `jest.mock`.
- Panggilan HTTP antar-service (`axios`) di-mock.
- Publisher RabbitMQ (`publishEvent`) di-mock.
- Redis untuk `queue-service` diuji dengan **fake in-memory client** yang
  meniru perintah sorted-set/hash yang dipakai (`zadd`, `zrank`, `zcard`,
  `hset`, `hgetall`, dst.) — dipilih dibanding menambah dependency
  `ioredis-mock` baru karena `package.json` tidak mencantumkannya.

Pendekatan ini **cukup untuk memvalidasi logika bisnis dan percabangan
kondisi** (status codes, perhitungan angka, urutan pemanggilan), tapi
**tidak** memvalidasi:
- Query SQL sesungguhnya / relasi Sequelize (`include`, foreign key, index).
- Perilaku commit/rollback transaksi Postgres sungguhan.
- Konkurensi nyata (race condition saat 2 request reserve slot yang sama
  bersamaan — hanya diuji secara logis lewat status code 409, bukan lewat
  concurrency test sungguhan).
- Perilaku RabbitMQ/Redis sungguhan (reconnect, message durability, dsb).

Setiap test dijalankan dengan `npx jest --coverage` dan hasilnya (pass/fail,
angka coverage) dikutip apa adanya di §3 — termasuk yang coverage-nya rendah.

---

## 3. Hasil Pengujian

### 3.1 Ringkasan hasil & coverage

| Service | Test | Status | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|---|---|
| user-service | 11/11 | ✅ PASS | 98.5% | 87.5% | 100% | 98.5% |
| booking-service | 11/11 | ✅ PASS | 90.8% | 74.1% | 60% | 92.2% |
| billing-service | 7/7 | ✅ PASS | 93.3% | 76.9% | 100% | 93.3% |
| queue-service | 6/6 | ✅ PASS | 56.0% | 44.1% | 54.5% | 57.6% |
| payment-service | 6/6 | ✅ PASS | 100% | 100% | 100% | 100% |
| station-service | 8/8 | ✅ PASS | 74.3% | 65.4% | 88.9% | 77.4% |
| api-gateway | 6/6 | ✅ PASS | 95.7% | 78.6% | 100% | 95.7% |
| session-service | 10/10 | ✅ PASS | 87.5% | 76.1% | 60% | 87.3% |

**Catatan tentang coverage rendah:**
- `queue-service` (56%): fungsi `startSlotWatcher` (polling `setInterval`
  yang memindai antrian aktif tiap 30 detik) sengaja tidak diuji — memerlukan
  fake timer & mock Redis `keys()` yang lebih kompleks, dan bernilai lebih
  tinggi diuji sebagai integration test terhadap Redis sungguhan.
- `booking-service` & `session-service` (fungsi 60%): helper internal
  (`calculateEstimatedCost`, bagian query `sequelize.fn('AVG', ...)`) sudah
  tercakup secara **tidak langsung** lewat assertion pada hasil akhir, tapi
  tidak diuji sebagai unit terisolasi.

### 3.2 Bug kritis: modul `messaging/publisher` hilang

**Severity: Tinggi (crash saat startup).**

Saat menulis test untuk `payment-service`, `jest` gagal dengan:
```
Cannot find module '../messaging/publisher' from 'paymentController.js'
```

Investigasi menunjukkan file `src/messaging/publisher.js` **hanya ada di
`booking-service`**, padahal di-`require` juga oleh:

| File | Service |
|---|---|
| `controllers/paymentController.js` | payment-service |
| `routes/webhook.js` | payment-service |
| `controllers/queueController.js` (lazy require) | queue-service |
| `websocket/ocppHandler.js` | monitoring-service |
| `controllers/sessionController.js` | session-service |

Keempat service ini (payment, queue, monitoring, session) akan **gagal start**
(`MODULE_NOT_FOUND`) begitu baris kode yang memuat modul tersebut dieksekusi —
untuk `payment-service` dan `session-service` ini terjadi di top-level
`require`, sehingga service **tidak bisa boot sama sekali**.

**Perbaikan yang dilakukan:** menambahkan `src/messaging/publisher.js` ke
keempat service, mengikuti pola implementasi `booking-service` (koneksi
RabbitMQ dengan retry, deklarasi exchange, fungsi `publishEvent`), dengan
`source` pada envelope event disesuaikan nama service masing-masing.

**Temuan turunan:** exchange `session` (dipakai `session-service` untuk
`session.completed`) tidak pernah dideklarasikan (`assertExchange`) di
manapun — ditambahkan ke daftar `EXCHANGES` di semua salinan `publisher.js`
termasuk milik `booking-service` sendiri.

> **Rekomendasi:** Backend Developer / Infrastructure sebaiknya
> mempertimbangkan memindahkan `messaging/publisher.js` menjadi **shared
> package** (mis. `packages/event-publisher`) alih-alih disalin manual ke
> tiap service, supaya bug "file lupa disalin" seperti ini tidak berulang
> saat service baru ditambahkan.

### 3.3 Ketidaksesuaian dokumentasi API (README)

Ditemukan saat memverifikasi path endpoint untuk skrip load test terhadap
source code (bukan hanya OpenAPI spec):

| Didokumentasikan (sebelum) | Kode sumber sesungguhnya |
|---|---|
| `GET /api/queue/position/:bookingId` | `GET /api/queue/position/me` (pakai identitas dari JWT) |
| `DELETE /api/queue/leave/:bookingId` | `DELETE /api/queue/leave` (tanpa parameter) |
| `POST /api/payments/:id/confirm` | **Tidak ada** — konfirmasi datang dari webhook `POST /webhook/midtrans`, bukan dipanggil klien |

Ketiganya sudah diperbaiki di `README.md`.

### 3.4 Catatan kualitas kode (bukan bug, tapi perlu diketahui)

- `services/station-service/src/routes/stations.js`, endpoint `GET /stations`
  dengan filter `lat`/`lng`: kode membaca `s.latitude` / `s.longitude`
  langsung dari instance Sequelize (bukan hasil `.toJSON()`), sementara
  respons akhir dibangun dari `{ ...s.toJSON(), distance_km }`. Ini bekerja
  karena Sequelize mengekspos kolom sebagai properti langsung juga, tapi
  tidak konsisten gaya dengan baris di sekitarnya — berpotensi membingungkan
  saat instance di-serialize/di-mock secara berbeda (seperti yang sempat
  membuat satu test QA gagal sebelum mock diperbaiki).
- `bookingController.createBooking` melakukan 2 panggilan `axios.get`
  sinkron tanpa `timeout` eksplisit sebelum menulis apa pun ke database —
  lihat implikasi performa di §4.

---

## 4. Analisis Risiko Performa (dari code review, untuk load test)

Karena load test **belum dieksekusi** terhadap stack hidup (§5), bagian ini
adalah **prediksi berbasis review kode**, bukan hasil pengukuran:

1. **Saga booking tanpa timeout** — `bookingController.js` memanggil
   `user-service` lalu `station-service` secara berurutan via `axios` tanpa
   `timeout` yang di-set. Di bawah beban tinggi atau saat salah satu service
   downstream lambat, request `POST /api/bookings` bisa menggantung lama,
   memenuhi connection pool, dan berantai memperlambat gateway.
2. **Pencarian stasiun O(n) di application layer** — filter radius
   (Haversine) dihitung untuk *semua* baris hasil `Station.findAll` di
   memori Node.js, bukan di level query database. Akan melambat linear
   seiring jumlah stasiun bertambah; pada skala kecil (puluhan stasiun) tidak
   masalah, tapi perlu diwaspadai untuk skala nasional.
3. **Rate limiter dengan fallback diam-diam** — `createRateLimiter()` di
   API Gateway otomatis pindah ke in-memory store bila Redis error. Ini baik
   untuk availability, tapi berarti batas rate-limit **tidak konsisten**
   antar-instance saat gateway di-scale >1 replica dan Redis sempat putus —
   perlu diverifikasi eksplisit saat load test dijalankan dengan multi-replica.
4. **`authRateLimiter` (5 req/menit/IP)** akan otomatis membatasi skenario
   `stress`/`spike` pada skrip load test (yang mendaftarkan user baru tiap
   iterasi) — ini **perilaku yang diharapkan**, dicatat supaya `429` pada
   `/api/auth/*` tidak disalahartikan sebagai kegagalan sistem saat laporan
   load test sungguhan dibuat.

---

## 5. Keterbatasan Lingkungan Pengujian

- Sandbox QA yang dipakai untuk mengerjakan tugas ini **hanya memiliki
  akses jaringan ke registry paket** (`npm`, `pip`, dsb.), **tidak** ke
  port Docker Compose (Postgres, Redis, MongoDB, RabbitMQ) atau image
  registry container. Akibatnya:
  - `k6 run load-test/k6-booking-flow.js` **belum bisa dieksekusi** di
    sini — skrip sudah diverifikasi manual path-per-path terhadap route
    asli, tapi belum diverifikasi lewat eksekusi sungguhan.
  - Test yang memerlukan Postgres/Redis/RabbitMQ sungguhan (migrasi,
    concurrency locking, transaksi lintas service) tidak dapat dijalankan
    di sini.
- **Tindak lanjut wajib bagi tim** sebelum menganggap sistem "lulus QA":
  1. Jalankan `docker compose up -d` di lingkungan dev/staging.
  2. Jalankan `k6 run -e SCENARIO=smoke load-test/k6-booking-flow.js`
     terlebih dulu untuk memastikan alur dasar berjalan, baru lanjut ke
     `load`/`stress`/`spike`.
  3. Bandingkan hasil aktual terhadap threshold di `load-test/README.md`
     dan perbarui bagian §4 laporan ini dengan angka sungguhan.

---

## 6. Rekomendasi Lanjutan

| Prioritas | Rekomendasi |
|---|---|
| Tinggi | Jalankan load test sungguhan terhadap stack hidup, khususnya skenario `stress`/`spike` pada endpoint `POST /api/bookings` (saga paling kompleks). |
| Tinggi | Tambahkan `timeout` eksplisit pada seluruh panggilan `axios` antar-service (saat ini tidak ada), supaya kegagalan satu service tidak menggantung service lain. |
| Sedang | Tambahkan test untuk `notification-service` dan `monitoring-service` (websocket/OCPP handler) — belum tercakup sama sekali di iterasi QA ini. |
| Sedang | Tambahkan test konkurensi nyata (mis. dengan `docker compose` + 2 request paralel) untuk memvalidasi bahwa endpoint reserve slot benar-benar atomik di level database, tidak hanya di level mock. |
| Sedang | Pertimbangkan memindahkan `messaging/publisher.js` menjadi shared package agar tidak perlu disalin manual per service (lihat §3.2). |
| Rendah | Selaraskan gaya akses properti Sequelize instance vs. `.toJSON()` di `station-service` (lihat §3.4) untuk konsistensi kode. |
| Rendah | Tambahkan `jest.config.js` per service dengan `coverageThreshold` agar coverage minimum ditegakkan otomatis di CI, bukan hanya dilaporkan manual seperti di dokumen ini. |

---

## 7. Lampiran

- Daftar file test: `services/*/src/__tests__/*.test.js` (8 file, 65 test).
- Skrip load test: `load-test/k6-booking-flow.js`.
- Dokumentasi load test: `load-test/README.md`.
- Catatan proses AI: `AI-LOG.md`.
