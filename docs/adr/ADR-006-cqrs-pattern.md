# ADR-006 — CQRS Pattern untuk Monitoring Service

| Field | Value |
|---|---|
| **ID** | ADR-006 |
| **Judul** | CQRS Pattern untuk Monitoring Service |
| **Status** | Accepted |
| **Tanggal** | 2026-08-15 |
| **Pengusul** | Arsitek Sistem |
| **Pengambil Keputusan** | Seluruh Tim |

---

## Konteks

Monitoring Service memiliki karakteristik yang sangat unik dibanding service lain:
- **Write-heavy**: Menerima data sensor dari setiap charger setiap 10 detik (10 charger = 6 tulisan/menit per charger = 60 writes/menit)
- **Read pattern berbeda**: 
  - Dashboard real-time: baca data 10 detik terakhir
  - Analitik historis: agregasi data per jam/hari/bulan
  - Alerting: baca threshold dan status terkini

Pola read dan write yang berbeda drastis ini menyebabkan bottleneck jika menggunakan single model.

---

## Keputusan

**Dipilih: CQRS (Command Query Responsibility Segregation) untuk Monitoring Service**

- **Command side (Write)**: MongoDB collection `charger_readings` — teroptimasi untuk write cepat
- **Query side (Read)**: 
  - MongoDB aggregation pipeline untuk historis
  - In-memory cache (Redis) untuk data real-time terbaru per charger
  - Socket.io broadcast untuk live dashboard

---

## Alasan

### Mengapa CQRS di Monitoring Service

**Masalah tanpa CQRS**:
```
Write: INSERT 1 dokumen setiap 10 detik per charger
Read-realtime: SELECT latest per charger (bisa banyak concurrent user)
Read-analytic: GROUP BY hour, DAY, SUM(energy) (query berat)

→ Semua ini berkompetisi di satu collection MongoDB
→ Query analitik lambat mengblok write real-time
→ Write real-time menginterupsi query analitik
```

**Dengan CQRS**:
```
Write path:
  OCPP handler → Insert ke MongoDB (fast, append-only)
              → Update Redis cache (latest per charger)
              → Broadcast via Socket.io (real-time push)

Query path (real-time dashboard):
  Request → Baca dari Redis cache → Response dalam <1ms

Query path (historis/analitik):
  Request → MongoDB aggregation pipeline → Response
  (tidak bersaing dengan write path)
```

### Karakteristik Data Sensor

| Aspek | Nilai |
|---|---|
| Frekuensi write | 1 per 10 detik per charger |
| Retention | 1 tahun (TTL index) |
| Volume per hari (100 charger) | 864,000 dokumen |
| Ukuran per dokumen | ~300 bytes |
| Total per hari | ~259 MB |

---

## Implementasi

### Write Side Architecture

```javascript
// OCPP Handler — Command Side
class OCPPHandler {
  async handleMeterValues(chargerId, data) {
    // 1. Simpan ke MongoDB (persistent store)
    const reading = await ChargerReading.create({
      charger_id: chargerId,
      timestamp: new Date(),
      power_kw: data.power_kw,
      energy_kwh: data.energy_kwh,
      state_of_charge: data.soc,
      voltage_v: data.voltage,
      current_a: data.current,
      temperature_c: data.temperature
    });

    // 2. Update Redis cache (latest state)
    await redis.setex(
      `charger:latest:${chargerId}`,
      30, // expire 30 detik
      JSON.stringify({
        power_kw: data.power_kw,
        soc: data.soc,
        energy_kwh: data.energy_kwh,
        updated_at: new Date()
      })
    );

    // 3. Broadcast via WebSocket (real-time push)
    this.socketHub.emit(`charger:${chargerId}`, {
      power_kw: data.power_kw,
      soc: data.soc,
      energy_kwh: data.energy_kwh,
      eta_minutes: this.calculateETA(data),
      timestamp: new Date()
    });

    // 4. Alert engine
    await this.alertEngine.check(chargerId, data);
  }
}
```

### Read Side Architecture

```javascript
// Query Handler — Read Side
class MonitoringQueryHandler {

  // Real-time: dari Redis (< 1ms)
  async getLatestReading(chargerId) {
    const cached = await redis.get(`charger:latest:${chargerId}`);
    if (cached) return JSON.parse(cached);
    
    // Fallback: query MongoDB jika cache miss
    return ChargerReading.findOne(
      { charger_id: chargerId },
      {},
      { sort: { timestamp: -1 } }
    );
  }

  // Historis: MongoDB aggregation (query berat, tidak bersaing dengan write)
  async getHourlyAggregate(chargerId, startDate, endDate) {
    return ChargerReading.aggregate([
      {
        $match: {
          charger_id: chargerId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
            hour: { $hour: "$timestamp" }
          },
          avg_power_kw: { $avg: "$power_kw" },
          max_power_kw: { $max: "$power_kw" },
          total_energy_kwh: { $sum: "$energy_kwh" },
          reading_count: { $count: {} }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
    ]);
  }

  // Status semua charger di stasiun: dari Redis (fast multi-get)
  async getStationStatus(stationId) {
    const chargerIds = await this.getChargerIds(stationId);
    const pipeline = redis.pipeline();
    chargerIds.forEach(id => pipeline.get(`charger:latest:${id}`));
    const results = await pipeline.exec();
    return results.map(([err, data]) => data ? JSON.parse(data) : null);
  }
}
```

### MongoDB Indexes

```javascript
// Index untuk query performance
db.charger_readings.createIndex({ charger_id: 1, timestamp: -1 });  // Point query
db.charger_readings.createIndex({ timestamp: 1 }, { expireAfterSeconds: 31536000 });  // TTL 1 tahun
db.charger_readings.createIndex({ booking_id: 1 });  // Per-booking query

// Partial index untuk active sessions
db.charging_sessions.createIndex(
  { charger_id: 1 },
  { partialFilterExpression: { status: "ACTIVE" } }
);
```

---

## Kapan TIDAK menggunakan CQRS

Service lain (Booking, Payment, User, Station) menggunakan **simple CRUD tanpa CQRS** karena:
- Volume read/write seimbang dan tidak terlalu tinggi
- Query complexity rendah (tidak butuh complex aggregation)
- Menambah CQRS di service yang tidak butuhnya hanya menambah kompleksitas

**Rule**: Gunakan CQRS hanya saat ada asimetri ekstrem antara read dan write pattern.

---

## Konsekuensi

### Positif
- Write path sangat cepat (MongoDB append + Redis update)
- Read path real-time sangat cepat (dari Redis cache)
- Read path analitik tidak menginterupsi write
- Dapat scale write dan read secara independen

### Negatif
- Kompleksitas implementasi lebih tinggi
- Potensi stale data di Redis (maksimal 30 detik ketinggalan)
- Dua path (command dan query) harus dimaintain secara terpisah
- Testing lebih kompleks

### Mitigasi
- Stale data 30 detik dapat diterima untuk monitoring dashboard
- Jika Redis down: fallback ke MongoDB query (lebih lambat tapi tetap bisa)
- Comprehensive test untuk kedua path (command dan query)
