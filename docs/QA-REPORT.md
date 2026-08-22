# QA Report — EV Charging Booking System

## 1. Environment

- Platform: GitHub Codespaces
- Docker: 29.3.0
- Docker Compose: v2.40.3
- Branch: qa/fix-frontend-docker

## 2. Test

Command:

docker compose -f infrastructure/docker-compose.yml build frontend

## 3. Findings

### QA-001 — Frontend Dockerfile Missing

Severity: High
Status: FIXED

Docker Compose mendefinisikan service frontend menggunakan Dockerfile,
tetapi frontend/Dockerfile tidak tersedia.

Error:

failed to read dockerfile: open Dockerfile: no such file or directory

Fix:
- Menambahkan frontend/Dockerfile
- Menyesuaikan build context pada infrastructure/docker-compose.yml

### QA-002 — Missing tsconfig.node.json

Severity: High
Status: FIXED

frontend/tsconfig.json mereferensikan tsconfig.node.json, tetapi file tersebut
tidak tersedia.

Error:

TS6053: File /app/tsconfig.node.json not found.

Fix:
- Menambahkan frontend/tsconfig.node.json

### QA-003 — Missing Frontend Pages

Severity: Critical
Status: OPEN

frontend/src/App.tsx mengimpor halaman yang tidak tersedia:

- BookingsPage.tsx
- BookingDetailPage.tsx
- PaymentPage.tsx
- MonitoringPage.tsx
- QueuePage.tsx
- ProfilePage.tsx

Error:

Cannot find module ./pages/BookingsPage
Cannot find module ./pages/BookingDetailPage
Cannot find module ./pages/PaymentPage
Cannot find module ./pages/MonitoringPage
Cannot find module ./pages/QueuePage
Cannot find module ./pages/ProfilePage

Impact:

TypeScript compilation gagal sehingga production build frontend tidak
dapat diselesaikan.

Recommendation:

Developer perlu menyediakan halaman yang diimpor oleh App.tsx atau
menghapus route yang memang belum menjadi bagian dari implementasi.

### QA-004 — Unused Imports

Severity: Medium
Status: OPEN

Build gagal karena konfigurasi TypeScript menggunakan:

noUnusedLocals: true

Import yang tidak digunakan ditemukan pada:

- src/components/common/Layout.tsx
- src/pages/BookingPage.tsx
- src/pages/StationDetailPage.tsx
- src/pages/StationsPage.tsx

Contoh:

- CreditCard
- X
- Clock
- toast
- Zap
- Filter

Recommendation:

Developer perlu menghapus import yang tidak digunakan atau menggunakan
import tersebut apabila memang dibutuhkan.

### QA-005 — Vite Environment Type

Severity: Medium
Status: FIXED

src/services/api.ts menggunakan import.meta.env.VITE_API_BASE_URL.

Sebelumnya TypeScript menghasilkan:

Property env does not exist on type ImportMeta

Fix:

Menambahkan frontend/src/vite-env.d.ts dengan:

/// <reference types="vite/client" />

Setelah perbaikan, error ImportMeta.env tidak muncul lagi.

## 4. Current Test Result

FAILED

Frontend Docker production build belum berhasil.

Error yang masih menghambat build:

1. Missing frontend pages — QA-003
2. Unused imports — QA-004

## 5. Summary

| ID | Finding | Status |
|---|---|---|
| QA-001 | Frontend Dockerfile missing | FIXED |
| QA-002 | tsconfig.node.json missing | FIXED |
| QA-003 | Six frontend pages missing | OPEN |
| QA-004 | Unused imports | OPEN |
| QA-005 | Vite environment type | FIXED |

Overall Status: NOT READY FOR PRODUCTION BUILD

## 6. Next QA Steps

Setelah developer memperbaiki source code:

1. Retest frontend Docker build.
2. Jalankan seluruh Docker Compose services.
3. Periksa status dan health container.
4. Test API Gateway.
5. Test authentication.
6. Test station.
7. Test booking.
8. Test payment.
9. Test queue.
10. Test monitoring.
11. Melakukan load test.
12. Mengumpulkan AI-LOG / monitoring evidence.
13. Update README.
14. Menyusun laporan akhir QA.
