# ADR-005 — Strategi Autentikasi dengan JWT RS256

| Field | Value |
|---|---|
| **ID** | ADR-005 |
| **Judul** | Strategi Autentikasi dengan JWT RS256 |
| **Status** | Accepted |
| **Tanggal** | 2026-08-15 |
| **Pengusul** | Arsitek Sistem |
| **Pengambil Keputusan** | Seluruh Tim |

---

## Konteks

Sistem ini memiliki banyak service yang perlu memverifikasi identitas pengguna. Pilihan autentikasi:
1. **Session-based** — server simpan session di database/Redis
2. **JWT HS256** — satu secret key untuk sign dan verify
3. **JWT RS256** — private key untuk sign, public key untuk verify
4. **OAuth2 / OpenID Connect** — delegasi ke identity provider eksternal

---

## Keputusan

**Dipilih: JWT RS256 (asymmetric) dengan Refresh Token**

- **Access Token**: JWT RS256, expire 15 menit, disimpan di memory (tidak di localStorage)
- **Refresh Token**: UUID opaque, expire 7 hari, disimpan di HttpOnly cookie

---

## Alasan

### Mengapa JWT (bukan Session)
- **Stateless**: Service tidak perlu query database/Redis untuk setiap request
- **Microservices-friendly**: Setiap service bisa verify token tanpa memanggil User Service
- **Performance**: Verification dilakukan lokal tanpa network call

### Mengapa RS256 (bukan HS256)
- **RS256 menggunakan asymmetric key pair**: private key (hanya di User Service) untuk signing, public key (bisa dibagikan ke semua service) untuk verification
- **HS256 menggunakan shared secret**: jika secret bocor di satu service, seluruh sistem kompromis
- **Dengan RS256**: service lain hanya butuh public key → tidak bisa buat token palsu, hanya bisa verify

```
User Service         API Gateway / Service lain
(private key)        (public key)
     │                     │
     ▼                     ▼
  SIGN token           VERIFY token
  (create)             (validate)
```

### Mengapa Refresh Token Pattern
- Access token expire cepat (15 menit) → security
- Refresh token (7 hari) → user tidak perlu login ulang terus
- Refresh token disimpan di database → bisa di-revoke kapan saja (logout, security breach)

### Mengapa BUKAN OAuth2/OIDC
- Terlalu kompleks untuk skala project ini
- Tidak ada kebutuhan federated identity (login dengan Google/Facebook)
- Tim sudah familiar dengan JWT
- Bisa ditambahkan sebagai layer di atas sistem saat ini jika diperlukan

---

## Implementasi

### Token Payload Structure

```json
{
  "sub": "usr_001",
  "email": "driver@email.com",
  "name": "Budi Santoso",
  "role": "USER",
  "iat": 1723680000,
  "exp": 1723680900,
  "iss": "ev-charging-user-service",
  "aud": "ev-charging-system"
}
```

### Token Flow

```
1. POST /auth/login
   ├── Verify credentials
   ├── Generate access_token (JWT RS256, 15 min)
   ├── Generate refresh_token (UUID, 7 days)
   ├── Hash refresh_token, store in DB
   └── Return: { access_token, expires_in: 900 }
        + Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict

2. Request dengan access_token
   └── Authorization: Bearer <access_token>

3. Access token expired → POST /auth/refresh
   ├── Read refresh_token from HttpOnly cookie
   ├── Hash dan cari di DB
   ├── Jika valid dan belum expired → generate access_token baru
   └── Return: { access_token, expires_in: 900 }

4. POST /auth/logout
   ├── Delete refresh_token dari DB
   └── Clear HttpOnly cookie
```

### API Gateway Verification

```javascript
// Verify JWT dengan public key
const jwt = require('jsonwebtoken');
const publicKey = fs.readFileSync('./keys/public.pem');

function verifyToken(token) {
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'ev-charging-user-service',
    audience: 'ev-charging-system'
  });
}
```

### RBAC (Role-Based Access Control)

| Role | Akses |
|---|---|
| **USER** | Booking, antrian, pembayaran, monitoring booking sendiri |
| **OPERATOR** | Semua USER + kelola stasiun, slot, dan charger |
| **ADMIN** | Semua akses + kelola user, konfigurasi sistem |

```javascript
// Middleware RBAC di setiap service
function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Contoh penggunaan
router.post('/stations', requireRole('OPERATOR', 'ADMIN'), stationController.create);
```

---

## Security Considerations

### Penyimpanan Token di Frontend
- **Access token**: disimpan di memori JavaScript (React state/Zustand) — TIDAK di localStorage (rentan XSS)
- **Refresh token**: HttpOnly cookie — tidak bisa diakses JavaScript (aman dari XSS)
- **CSRF protection**: SameSite=Strict pada cookie + custom header validation

### Key Rotation
- Private/public key pair di-rotate setiap 90 hari
- Saat rotasi: User Service sign dengan private key baru, semua service dapat public key baru
- Grace period 15 menit (masa hidup access token) setelah key baru distribusi

### Token Revocation
- Access token tidak bisa di-revoke (stateless) → masa hidup pendek (15 menit) sebagai mitigasi
- Refresh token di-revoke dengan menghapus dari database
- Untuk keamanan tinggi (misalnya akun dicuri): hapus SEMUA refresh token user dari DB

---

## Konsekuensi

### Positif
- Autentikasi stateless dan scalable
- Service tidak perlu memanggil User Service untuk setiap request
- RS256 lebih aman dari HS256 untuk multi-service environment
- Refresh token rotation memberikan keseimbangan security dan UX

### Negatif
- Access token tidak bisa di-revoke sebelum expired (15 menit window)
- Butuh manajemen key RSA (generate, distribusi, rotasi)
- Refresh token membutuhkan database query
- Kompleksitas lebih tinggi dari session sederhana

### Mitigasi
- Masa hidup access token pendek (15 menit) membatasi window exploit
- Refresh token tersimpan di HttpOnly cookie (aman dari XSS)
- Implement token blacklist di Redis untuk kasus darurat (opsional, hanya jika diperlukan)
