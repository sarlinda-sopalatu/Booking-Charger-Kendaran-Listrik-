# ADR-002 — Pemilihan API Gateway Pattern

| Field | Value |
|---|---|
| **ID** | ADR-002 |
| **Judul** | Pemilihan API Gateway Pattern |
| **Status** | Accepted |
| **Tanggal** | 2026-08-15 |
| **Pengusul** | Arsitek Sistem |
| **Pengambil Keputusan** | Seluruh Tim |

---

## Konteks

Dengan arsitektur microservices, frontend perlu berkomunikasi dengan banyak service. Tanpa gateway, frontend harus:
- Tahu URL dari setiap service (coupling tinggi)
- Handle JWT verification di setiap service secara duplikat
- Tidak ada titik pusat untuk rate limiting dan logging

Pilihan yang dipertimbangkan:
1. **Custom API Gateway** (Node.js + Express + http-proxy-middleware)
2. **Kong API Gateway** (open-source, plugin-based)
3. **AWS API Gateway** (managed cloud service)
4. **No Gateway** (frontend langsung ke setiap service)

---

## Keputusan

**Dipilih: Custom API Gateway (Node.js + Express)**

Gateway diimplementasikan sebagai service Node.js sederhana yang melakukan:
- JWT verification (semua request kecuali auth endpoints)
- Rate limiting berbasis Redis
- Request routing berbasis path prefix
- Request/response logging
- CORS handling

---

## Alasan

### Mengapa Custom Gateway
- **Kontrol penuh** — bisa menyesuaikan behavior routing dan middleware sesuai kebutuhan
- **Tidak ada vendor lock-in** — tidak bergantung pada produk pihak ketiga
- **Ringan dan cepat** — hanya melakukan proxy, tidak ada business logic
- **Familiar teknologi** — tim sudah familiar dengan Node.js + Express
- **Mudah dikustomisasi** — tambah middleware baru (tracing, A/B testing) tanpa belajar tool baru

### Mengapa BUKAN Kong
- Butuh konfigurasi YAML yang kompleks
- Overhead resource lebih besar
- Kurva belajar lebih tinggi untuk tim
- Overkill untuk skala proyek ini

### Mengapa BUKAN AWS API Gateway
- Vendor lock-in ke AWS
- Biaya dapat membengkak seiring skala
- Tidak cocok untuk deployment on-premise

### Mengapa BUKAN No Gateway
- Setiap service harus implement JWT verification sendiri → duplikasi
- Frontend ter-coupling ke internal architecture
- Tidak ada single point untuk cross-cutting concerns

---

## Implementasi

### Routing Rules

```
/api/auth/*        → User Service :3001
/api/users/*       → User Service :3001
/api/stations/*    → Station Service :3002
/api/bookings/*    → Booking Service :3003
/api/queue/*       → Queue Service :3004
/api/payments/*    → Payment Service :3005
/api/monitoring/*  → Monitoring Service :3006
```

### Middleware Pipeline

```
Request
   │
   ▼
[CORS Middleware]
   │
   ▼
[Request Logger] ← log semua request
   │
   ▼
[Rate Limiter] ← Redis-based, per IP/user
   │
   ▼
[JWT Auth] ← skip untuk /api/auth/*
   │
   ▼
[HTTP Proxy] ← forward ke service
   │
   ▼
[Response Logger] ← log status dan durasi
   │
   ▼
Response
```

### JWT Forwarding

Gateway menambahkan header ke service downstream:
```
X-User-Id: usr_001
X-User-Email: user@email.com
X-User-Role: USER
```

Service downstream **tidak perlu verify JWT** — cukup baca header ini.

---

## Konsekuensi

### Positif
- Single entry point untuk semua client
- JWT verification terpusat (tidak duplikat di setiap service)
- Rate limiting dan logging terpusat
- Mudah menambah/mengubah routing tanpa memengaruhi client atau service

### Negatif
- API Gateway menjadi single point of failure → mitigasi dengan health check dan restart policy di Docker
- Menambah satu hop latency → diterima karena hanya proxy (tidak ada business logic)
- Harus diupdate saat ada service baru ditambahkan
