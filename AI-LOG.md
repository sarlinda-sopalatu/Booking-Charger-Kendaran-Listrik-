# AI-LOG — Catatan Penggunaan AI (Peran: QA Engineer)

> Deliverable sesuai tabel peran di `README.md`:
> **QA Engineer** — Pengujian, load test, AI-LOG, README, dan laporan akhir.

Dokumen ini mencatat *bagaimana* dan *untuk apa* AI (Claude) digunakan dalam
pengerjaan bagian QA proyek ini, termasuk asumsi yang diambil dan bagian yang
tetap memerlukan verifikasi manusia. Tujuannya transparansi proses, bukan
menyembunyikan bahwa alat AI digunakan.

## 1. Ringkasan sesi

| | |
|---|---|
| Tanggal | 22 Agustus 2026 |
| Model | Claude (Anthropic) |
| Ruang lingkup | QA: unit/integration test, load test, dokumentasi, laporan akhir |
| Input yang diberikan ke AI | Arsip kode sumber proyek (`Booking-Charger-Kendaran-Listrik--main.zip`) — seluruh 8 microservice, frontend, migrations, docs arsitektur |
| Lingkungan eksekusi | Sandbox Linux (Node.js 20) dengan akses `npm install` ke registry publik; **tidak ada** akses ke Postgres/Redis/MongoDB/RabbitMQ sungguhan |

## 2. Metodologi

1. **Eksplorasi kode** — AI membaca struktur proyek, `package.json` tiap
   service, controller, route, dan model untuk memahami logika bisnis
   sebelum menulis test (bukan menebak dari nama file saja).
2. **Unit & integration test** — AI menulis test dengan `jest` + `supertest`,
   me-mock dependency I/O (Sequelize models, `axios`, Redis, RabbitMQ
   publisher) supaya test dapat **benar-benar dijalankan** di sandbox tanpa
   database sungguhan, lalu **dieksekusi** (`npx jest --coverage`) dan
   diperbaiki sampai lulus — bukan sekadar ditulis lalu diasumsikan benar.
3. **Load test** — AI menulis skrip `k6` yang mensimulasikan perjalanan
   pengguna nyata lewat API Gateway. Skrip ini **tidak dieksekusi** di
   sandbox karena stack Docker Compose (Postgres, Redis, MongoDB, RabbitMQ,
   8 service Node.js) tidak dapat dijalankan di lingkungan pengerjaan tugas
   ini (keterbatasan jaringan/sumber daya sandbox, lihat `LAPORAN-AKHIR-QA.md`
   §5). Analisis bottleneck dalam `load-test/README.md` bersifat **analitis
   berdasarkan code review**, bukan hasil pengukuran nyata.
4. **Verifikasi silang** — Setiap path endpoint yang dipakai di skrip load
   test dicocokkan manual terhadap definisi route (`router.get/post/put(...)`)
   di source code, bukan diasumsikan dari OpenAPI spec saja. Kesalahan path
   sempat ditemukan (`/api/queue/position` vs path asli `/api/queue/position/me`)
   dan diperbaiki pada iterasi berikutnya.
5. **Dokumentasi** — README dan laporan akhir ditulis berdasarkan hasil
   nyata dari langkah 2 (angka test/coverage yang benar-benar dihasilkan
   `jest`), bukan angka ilustratif.

## 3. Temuan penting selama proses (bug nyata, bukan hasil rekayasa test)

Saat menulis test untuk `payment-service`, test suite gagal dengan error
`Cannot find module '../messaging/publisher'`. Investigasi menunjukkan ini
**bukan kesalahan test**, melainkan **bug nyata di source code**:

- File `services/*/src/messaging/publisher.js` hanya ada di `booking-service`.
- Empat file lain (`payment-service/src/controllers/paymentController.js`,
  `payment-service/src/routes/webhook.js`,
  `queue-service/src/controllers/queueController.js`,
  `monitoring-service/src/websocket/ocppHandler.js`,
  `session-service/src/controllers/sessionController.js`) melakukan
  `require('../messaging/publisher')` ke path yang tidak ada di service
  masing-masing.
- Dampak: keempat service tersebut akan gagal start (`MODULE_NOT_FOUND`)
  di `node src/index.js` — bukan bug yang hanya muncul saat runtime tertentu,
  tapi crash langsung saat boot.

**Tindakan yang diambil:** AI Engineer/QA menambahkan `messaging/publisher.js`
yang identik polanya dengan milik `booking-service` ke keempat service
tersebut, dan menambahkan exchange `session` yang sebelumnya tidak
dideklarasikan di manapun (dipakai oleh `session-service` untuk publish
`session.completed`, tapi exchange-nya sendiri tidak pernah di-assert). Detail
lengkap ada di `LAPORAN-AKHIR-QA.md` §3.

## 4. Bagian yang dihasilkan AI vs. yang perlu verifikasi manusia

| Item | Status |
|---|---|
| Unit/integration test (65 test, 8 file) | ✅ Ditulis AI, **dieksekusi & lulus** di sandbox ini |
| Perbaikan bug `messaging/publisher` hilang | ✅ Ditulis AI, mengikuti pola kode yang sudah ada; **disarankan direview** oleh Backend Developer sebelum merge, khususnya pilihan exchange per service |
| Skrip load test k6 | ⚠️ Ditulis AI berdasarkan pemahaman route asli, **belum pernah dieksekusi** terhadap stack hidup — perlu dijalankan manual oleh tim sebelum dipakai sebagai bukti performa |
| Analisis bottleneck di `load-test/README.md` | ⚠️ Bersifat prediksi dari code review, **bukan** hasil pengukuran — perlu dikonfirmasi dengan hasil `k6 run` sungguhan |
| Angka coverage di `LAPORAN-AKHIR-QA.md` | ✅ Diambil langsung dari output `jest --coverage` yang benar-benar dijalankan, dicantumkan apa adanya (termasuk yang rendah, mis. `queue-service` 56%) |
| Test untuk service lain (notification-service, monitoring-service, frontend) | ❌ Belum dibuat — lihat rekomendasi di laporan akhir |

## 5. Batasan yang perlu diketahui pembaca

- Test bersifat **unit/integration dengan mock**, bukan **end-to-end** —
  tidak memvalidasi query SQL sungguhan, konfigurasi Sequelize `associations`,
  atau perilaku RabbitMQ/Redis yang sebenarnya. Ini pilihan sadar karena
  sandbox QA tidak memiliki akses ke infrastruktur tersebut, bukan karena
  dianggap tidak penting — lihat rekomendasi lanjutan di
  `LAPORAN-AKHIR-QA.md` §6.
- AI tidak memiliki akses untuk menjalankan `docker compose up` di sandbox
  ini (tidak ada akses jaringan ke image registry / port binding penuh),
  sehingga load test dan pengujian end-to end sungguhan **harus** dijalankan
  ulang oleh tim di lingkungan dev/staging yang sebenarnya.
- Beberapa file test menemukan/mengandalkan detail implementasi kecil
  (mis. `GET /stations` membaca `s.latitude` langsung dari instance
  Sequelize, bukan dari hasil `.toJSON()`) — dicatat sebagai catatan kualitas
  kode di laporan akhir, bukan diperbaiki langsung karena berada di luar
  lingkup "menambahkan test", untuk menghindari perubahan perilaku tanpa
  sepengetahuan pemilik modul (Backend Developer / Data Engineer).
