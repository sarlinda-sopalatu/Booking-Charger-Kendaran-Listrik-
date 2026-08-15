# ADR-007 — Strategi Real-time Monitoring dengan WebSocket

| Field | Value |
|---|---|
| **ID** | ADR-007 |
| **Judul** | Strategi Real-time Monitoring dengan WebSocket (Socket.io) |
| **Status** | Accepted |
| **Tanggal** | 2026-08-15 |
| **Pengusul** | Arsitek Sistem |
| **Pengambil Keputusan** | Seluruh Tim |

---

## Konteks

Fitur utama sistem ini adalah pemantauan pengisian daya secara real-time. Pengguna perlu melihat:
- Daya pengisian saat ini (kW)
- Persentase baterai (%)
- Energi yang telah dikirim (kWh)
- Estimasi waktu selesai (menit)
- Status koneksi charger

Data ini berasal dari hardware charger dan harus disampaikan ke frontend setiap ~10 detik.

Pilihan teknologi:
1. **Polling HTTP** — frontend pull setiap N detik
2. **Server-Sent Events (SSE)** — one-way stream dari server ke client
3. **WebSocket** — bidirectional, persistent connection
4. **Socket.io** — WebSocket dengan fallback dan room management

---

## Keputusan

**Dipilih: Socket.io (WebSocket dengan fallback)**

Socket.io digunakan di Monitoring Service untuk:
- Menerima data OCPP dari hardware charger (WebSocket server)
- Broadcast data real-time ke frontend clients yang sedang memonitor (Socket.io)

---

## Alasan

### Mengapa TIDAK HTTP Polling
- **Inefficient**: Frontend kirim request setiap 5 detik bahkan saat tidak ada data baru
- **Latency tinggi**: Data baru bisa terlambat sampai 5 detik
- **Server load**: N users × (60/5) = 12 requests/menit per user → bottleneck

### Mengapa TIDAK Server-Sent Events (SSE)
- **One-way only**: Client tidak bisa kirim pesan ke server (tidak cocok untuk interaksi monitoring)
- **Browser support terbatas** untuk beberapa kasus mobile
- Tidak ada room/namespace management

### Mengapa WebSocket/Socket.io
- **Bi-directional**: Client bisa subscribe/unsubscribe dari charger tertentu
- **Low latency**: Data dikirim saat tersedia, tanpa polling overhead
- **Efficient**: Satu koneksi persistent vs ribuan HTTP request
- **Room management**: `socket.join(`charger:${chargerId}`)` — broadcast hanya ke subscriber yang relevan
- **Auto-reconnect**: Socket.io handle reconnection secara otomatis
- **Fallback**: Long-polling sebagai fallback jika WebSocket terblokir

### Perbandingan Teknis

| Aspek | HTTP Polling | SSE | WebSocket/Socket.io |
|---|---|---|---|
| Protokol | HTTP | HTTP | WS/WSS |
| Arah | Client pull | Server push | Bidirectional |
| Latency | High (polling interval) | Low | Very Low |
| Server load | High | Medium | Low (persistent conn) |
| Reconnect | Manual | Auto | Auto (Socket.io) |
| Room/channel | Tidak ada | Tidak ada | Built-in |

---

## Implementasi

### Arsitektur Socket.io

```
Hardware Charger (OCPP WebSocket)
         │
         ▼
    OCPP Handler (Node.js WS Server)
         │
         ├─► MongoDB (simpan reading)
         ├─► Redis (update latest state)
         │
         └─► Socket.io Server
                  │
         ┌────────┼────────┐
         ▼        ▼        ▼
     Room:      Room:    Room:
  charger:C1  charger:C2  charger:C3
         │        │        │
         ▼        ▼        ▼
     Semua     Semua    Semua
     clients   clients  clients
   yang watch yang watch yang watch
      C1         C2       C3
```

### Server-side Implementation

```javascript
// Monitoring Service — WebSocket Setup
const io = require('socket.io')(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware: Autentikasi WebSocket
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    socket.userId = decoded.sub;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.userId}`);

  // Client subscribe ke charger tertentu
  socket.on('subscribe:charger', async (chargerId) => {
    // Validasi: apakah user punya booking aktif untuk charger ini?
    const hasAccess = await validateChargerAccess(socket.userId, chargerId);
    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied' });
      return;
    }

    socket.join(`charger:${chargerId}`);
    
    // Kirim data terbaru segera setelah subscribe
    const latest = await monitoringQueryHandler.getLatestReading(chargerId);
    socket.emit('reading:latest', latest);
    
    socket.emit('subscribed', { chargerId });
  });

  // Client unsubscribe
  socket.on('unsubscribe:charger', (chargerId) => {
    socket.leave(`charger:${chargerId}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.userId}, reason: ${reason}`);
  });
});

// Broadcast dari OCPP handler ke semua subscriber
function broadcastReading(chargerId, data) {
  io.to(`charger:${chargerId}`).emit('reading', {
    chargerId,
    power_kw: data.power_kw,
    state_of_charge: data.soc,
    energy_kwh: data.energy_kwh,
    voltage_v: data.voltage,
    current_a: data.current,
    eta_minutes: calculateETA(data),
    timestamp: new Date().toISOString()
  });
}
```

### Client-side Implementation (React)

```typescript
// Frontend Hook: useChargerMonitoring
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

interface ChargerReading {
  chargerId: string;
  power_kw: number;
  state_of_charge: number;
  energy_kwh: number;
  eta_minutes: number;
  timestamp: string;
}

export function useChargerMonitoring(chargerId: string) {
  const [reading, setReading] = useState<ChargerReading | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessToken = useAuthStore(state => state.accessToken);

  useEffect(() => {
    if (!chargerId || !accessToken) return;

    const socket: Socket = io(process.env.VITE_MONITORING_URL!, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe:charger', chargerId);
    });

    socket.on('reading', (data: ChargerReading) => {
      setReading(data);
    });

    socket.on('reading:latest', (data: ChargerReading) => {
      setReading(data);
    });

    socket.on('session_ended', (summary) => {
      // Tampil ringkasan pengisian selesai
    });

    socket.on('error', (err) => {
      setError(err.message);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.emit('unsubscribe:charger', chargerId);
      socket.disconnect();
    };
  }, [chargerId, accessToken]);

  return { reading, connected, error };
}
```

---

## OCPP Protocol Integration

Hardware charger berkomunikasi menggunakan protokol OCPP (Open Charge Point Protocol) 1.6 atau 2.0.1.

```
OCPP Message Flow:
Hardware → [BootNotification] → Monitoring Service: Registrasi charger
Hardware → [Heartbeat every 60s] → Monitoring Service: Cek konektivitas
Hardware → [StatusNotification] → Monitoring Service: Update status (Available/Charging/Faulted)
Hardware → [StartTransaction] → Monitoring Service: Mulai sesi pengisian
Hardware → [MeterValues every 10s] → Monitoring Service: Kirim telemetri
Hardware → [StopTransaction] → Monitoring Service: Akhiri sesi pengisian
```

---

## Skalabilitas

Jika perlu horizontal scaling Monitoring Service:
- Socket.io dengan **Redis Adapter** → broadcast ke semua instance
- `io.adapter(createAdapter(redisClient))`
- Semua instance berbagi room state via Redis

```
Client ──► Load Balancer
               ├──► Monitor Instance 1 (Socket.io + Redis Adapter)
               ├──► Monitor Instance 2 (Socket.io + Redis Adapter)
               └──► Monitor Instance 3 (Socket.io + Redis Adapter)
                              │
                              └──► Redis (shared socket.io state)
```

---

## Konsekuensi

### Positif
- Data real-time dengan latency sangat rendah (~100ms dari hardware ke browser)
- Efisien — satu WebSocket connection vs ratusan HTTP requests
- Auto-reconnect jika koneksi terputus
- Room management yang bersih per charger

### Negatif
- Koneksi persistent membutuhkan resource lebih di server
- Lebih kompleks dari REST API biasa
- Perlu handle edge cases: reconnect, stale subscription
- Horizontal scaling perlu Redis adapter tambahan

### Mitigasi
- Connection limit per user (maksimal 10 charger simultan)
- Heartbeat/ping untuk deteksi koneksi mati
- Graceful disconnect handler di client dan server
- Redis adapter sudah siap jika perlu scale horizontal
