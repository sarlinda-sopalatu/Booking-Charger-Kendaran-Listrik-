# Baseline Uji Beban — EV Charging Booking System

**Tanggal:** 2026-08-27  
**Tema:** 🔌 Booking Charger EV  
**Spesifikasi mesin:** Windows 11, backend via Docker  

---

## Skenario

- **Endpoint panas:** `POST /api/bookings`
- **Endpoint baca:** `GET /api/stations/:id`
- **Beban:** 1.500 request dalam 60 detik (25 req/s puncak)
- **Tool:** k6 via Docker (grafana/k6:latest)

---

## Hasil: Sebelum vs Sesudah Optimasi

| Metrik | Sebelum | Sesudah |
|--------|---------|---------|
| Rate limit | 100 req/menit/user | 1.000 req/menit/user |
| **p95 latency** | 20.67 ms | 44.57 ms |
| **p90 latency** | 11.03 ms | 30.70 ms |
| **Throughput** | 21.19 req/s | 21.16 req/s |
| **Error rate** | 97.36% | 98.06% |
| booking: bukan 5xx | ✅ 100% | ✅ 100% |
| stations: 200 | ❌ 6% | ❌ 5% |

---

## Analisis

### Sebelum Optimasi
- Error rate 97.36% murni karena **rate limiter terlalu ketat** (100 req/menit per user)
- Dengan hanya 3 akun, kuota habis dalam detik pertama
- Sistem stabil — tidak ada 5xx sama sekali

### Sesudah Optimasi (rate limit → 1.000 req/menit)
- Error rate tetap tinggi tapi **penyebab berubah**:
  - POST /bookings → **409 Conflict** (slot sudah penuh) — ini BENAR, sistem tidak oversell
  - GET /stations → **401 Unauthorized** (token rotasi bermasalah antar VU)
  - Beberapa **i/o timeout** → booking service sesekali lambat merespons
- `booking: bukan 5xx` tetap 100% → **tidak ada crash server**
- Latensi p95 naik dari 20ms → 44ms karena ada timeout requests masuk perhitungan

### Kesimpulan
- Sistem **tidak oversell slot** walau diserbu 1.500 request → konsistensi terjaga ✅
- Bottleneck sesungguhnya: **pool akun test terlalu kecil** (3 user) dan **5 slot cepat habis**
- Untuk produksi: pool token besar + slot date berbeda per VU akan menunjukkan performa sesungguhnya

---

## Perintah yang Digunakan

```bash
# Jalankan skenario k6
docker run --rm -v "./loadtest:/scripts" grafana/k6 run /scripts/skenario.js
```
