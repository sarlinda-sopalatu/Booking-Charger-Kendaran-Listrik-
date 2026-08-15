# 03 — Component Diagrams (C4 Level 3)

> **C4 Model — Level 3: Component Diagram**  
> Menampilkan komponen internal setiap service.

---

## 3.1 API Gateway — Komponen Internal

```mermaid
C4Component
    title API Gateway — Components

    Container_Boundary(gw, "API Gateway") {
        Component(router, "Request Router", "Express Router", "Menentukan service tujuan berdasarkan path prefix")
        Component(auth_mw, "JWT Auth Middleware", "jsonwebtoken", "Verifikasi dan decode JWT access token")
        Component(rate_limiter, "Rate Limiter", "express-rate-limit + Redis", "Batasi request per IP/user")
        Component(logger_mw, "Request Logger", "Morgan + Winston", "Log semua request/response")
        Component(proxy, "HTTP Proxy", "http-proxy-middleware", "Forward request ke service yang tepat")
        Component(health, "Health Controller", "Express", "Endpoint /health untuk monitoring")
    }

    Rel(router, auth_mw, "Pipe request")
    Rel(auth_mw, rate_limiter, "Pipe request terautentikasi")
    Rel(rate_limiter, logger_mw, "Pipe request")
    Rel(logger_mw, proxy, "Forward ke service")
```

---

## 3.2 User Service — Komponen Internal

```mermaid
C4Component
    title User Service — Components

    Container_Boundary(us, "User Service") {
        Component(auth_ctrl, "Auth Controller", "Express Controller", "Handle register, login, refresh token, logout")
        Component(user_ctrl, "User Controller", "Express Controller", "Handle CRUD profil pengguna")
        Component(internal_ctrl, "Internal Controller", "Express Controller", "API internal untuk service lain")
        Component(auth_svc, "Auth Service", "Business Logic", "Hash password, generate/verify JWT, manage refresh token")
        Component(user_repo, "User Repository", "Sequelize", "CRUD operasi ke tabel users")
        Component(token_repo, "Token Repository", "Sequelize", "Simpan dan validasi refresh token")
        Component(validate_mw, "Validation Middleware", "Joi", "Validasi request body")
        Component(user_model, "User Model", "Sequelize Model", "Schema tabel users")
    }

    ContainerDb(pg, "Users PostgreSQL DB")

    Rel(auth_ctrl, auth_svc, "Panggil")
    Rel(auth_svc, user_repo, "Gunakan")
    Rel(auth_svc, token_repo, "Gunakan")
    Rel(user_ctrl, user_repo, "Gunakan")
    Rel(user_repo, user_model, "Gunakan")
    Rel(user_model, pg, "Query")
    Rel(token_repo, pg, "Query")
```

---

## 3.3 Station Service — Komponen Internal

```mermaid
C4Component
    title Station Service — Components

    Container_Boundary(ss, "Station Service") {
        Component(station_ctrl, "Station Controller", "Express Controller", "CRUD stasiun pengisian")
        Component(charger_ctrl, "Charger Controller", "Express Controller", "CRUD charger per stasiun")
        Component(slot_ctrl, "Slot Controller", "Express Controller", "CRUD slot waktu, cek ketersediaan")
        Component(station_svc_layer, "Station Service Layer", "Business Logic", "Logika bisnis stasiun")
        Component(slot_svc_layer, "Slot Service Layer", "Business Logic", "Generate slot, validasi overlap, harga")
        Component(station_repo, "Station Repository", "Sequelize", "CRUD ke tabel stations")
        Component(slot_repo, "Slot Repository", "Sequelize", "CRUD ke tabel slots")
        Component(charger_repo, "Charger Repository", "Sequelize", "CRUD ke tabel chargers")
        Component(internal_api, "Internal API", "Express Router", "Endpoint /internal/* untuk service lain")
    }

    ContainerDb(pg_s, "Stations PostgreSQL DB")

    Rel(station_ctrl, station_svc_layer, "Panggil")
    Rel(slot_ctrl, slot_svc_layer, "Panggil")
    Rel(station_svc_layer, station_repo, "Gunakan")
    Rel(slot_svc_layer, slot_repo, "Gunakan")
    Rel(slot_svc_layer, charger_repo, "Gunakan")
    Rel(station_repo, pg_s, "Query")
    Rel(slot_repo, pg_s, "Query")
    Rel(charger_repo, pg_s, "Query")
```

---

## 3.4 Booking Service — Komponen Internal

```mermaid
C4Component
    title Booking Service — Components

    Container_Boundary(bs, "Booking Service") {
        Component(booking_ctrl, "Booking Controller", "Express Controller", "Create, get, cancel booking")
        Component(booking_svc_layer, "Booking Service Layer", "Business Logic + Saga", "Orkestrasi booking: cek slot → reserve → publish event")
        Component(booking_repo, "Booking Repository", "Sequelize", "CRUD ke tabel bookings")
        Component(event_repo, "Booking Event Repository", "Sequelize", "Log setiap perubahan status booking")
        Component(station_client, "Station Service Client", "Axios", "HTTP client ke Station Service")
        Component(user_client, "User Service Client", "Axios", "HTTP client ke User Service")
        Component(event_publisher, "Event Publisher", "amqplib", "Publish events ke RabbitMQ")
        Component(saga_mgr, "Saga Manager", "Business Logic", "Kelola transaksi terdistribusi booking")
    }

    ContainerDb(pg_b, "Bookings PostgreSQL DB")
    Container_Ext(rmq, "RabbitMQ")
    Container_Ext(station_svc_ext, "Station Service")

    Rel(booking_ctrl, booking_svc_layer, "Panggil")
    Rel(booking_svc_layer, saga_mgr, "Delegasikan")
    Rel(saga_mgr, station_client, "Cek & reserve slot")
    Rel(saga_mgr, user_client, "Validasi user")
    Rel(saga_mgr, booking_repo, "Simpan booking")
    Rel(saga_mgr, event_repo, "Log event")
    Rel(saga_mgr, event_publisher, "Publish events")
    Rel(event_publisher, rmq, "AMQP publish")
    Rel(station_client, station_svc_ext, "HTTP request")
    Rel(booking_repo, pg_b, "Query")
```

---

## 3.5 Queue Service — Komponen Internal

```mermaid
C4Component
    title Queue Service — Components

    Container_Boundary(qs, "Queue Service") {
        Component(queue_ctrl, "Queue Controller", "Express Controller", "Join, leave, get position, get queue list")
        Component(queue_svc_layer, "Queue Service Layer", "Business Logic", "Logika antrian: FIFO berdasarkan timestamp")
        Component(queue_repo, "Queue Repository", "ioredis", "Operasi Redis ZADD/ZRANK/ZREM untuk antrian")
        Component(event_consumer, "Event Consumer", "amqplib", "Consume booking.created, booking.cancelled events")
        Component(event_publisher, "Event Publisher", "amqplib", "Publish queue.slot.available event")
        Component(slot_watcher, "Slot Watcher", "Node.js setInterval", "Pantau perubahan slot, trigger notifikasi giliran")
    }

    ContainerDb(redis, "Redis Queue Store")
    Container_Ext(rmq_ext, "RabbitMQ")

    Rel(queue_ctrl, queue_svc_layer, "Panggil")
    Rel(queue_svc_layer, queue_repo, "Gunakan")
    Rel(queue_repo, redis, "ZADD / ZRANK / ZREM")
    Rel(event_consumer, rmq_ext, "Subscribe")
    Rel(event_consumer, queue_svc_layer, "Update antrian")
    Rel(slot_watcher, queue_svc_layer, "Cek slot tersedia")
    Rel(slot_watcher, event_publisher, "Publish giliran tersedia")
    Rel(event_publisher, rmq_ext, "AMQP publish")
```

---

## 3.6 Payment Service — Komponen Internal

```mermaid
C4Component
    title Payment Service — Components

    Container_Boundary(ps, "Payment Service") {
        Component(payment_ctrl, "Payment Controller", "Express Controller", "Inisiasi, status, konfirmasi pembayaran")
        Component(webhook_ctrl, "Webhook Controller", "Express Controller", "Terima callback dari payment gateway")
        Component(invoice_ctrl, "Invoice Controller", "Express Controller", "Generate dan download invoice PDF")
        Component(payment_svc_layer, "Payment Service Layer", "Business Logic", "Logika pembayaran, refund, expiry")
        Component(payment_repo, "Payment Repository", "Sequelize", "CRUD ke tabel payments")
        Component(invoice_repo, "Invoice Repository", "Sequelize", "CRUD ke tabel invoices")
        Component(gateway_client, "Payment Gateway Client", "Axios", "HTTP client ke Midtrans/Xendit API")
        Component(event_publisher, "Event Publisher", "amqplib", "Publish payment.completed, payment.failed events")
        Component(idempotency, "Idempotency Guard", "Redis", "Cegah duplikasi transaksi")
    }

    ContainerDb(pg_p, "Payments PostgreSQL DB")
    Container_Ext(rmq_ext2, "RabbitMQ")
    System_Ext(pg_ext, "Payment Gateway (Midtrans)")

    Rel(payment_ctrl, payment_svc_layer, "Panggil")
    Rel(webhook_ctrl, payment_svc_layer, "Process callback")
    Rel(payment_svc_layer, payment_repo, "Gunakan")
    Rel(payment_svc_layer, invoice_repo, "Gunakan")
    Rel(payment_svc_layer, gateway_client, "Buat transaksi")
    Rel(payment_svc_layer, idempotency, "Cek duplikat")
    Rel(payment_svc_layer, event_publisher, "Publish result")
    Rel(gateway_client, pg_ext, "HTTPS")
    Rel(event_publisher, rmq_ext2, "AMQP publish")
    Rel(payment_repo, pg_p, "Query")
```

---

## 3.7 Monitoring Service — Komponen Internal

```mermaid
C4Component
    title Monitoring Service — Components

    Container_Boundary(ms, "Monitoring Service") {
        Component(ocpp_handler, "OCPP Message Handler", "WebSocket Server", "Terima data sensor dari charger hardware")
        Component(monitor_ctrl, "Monitoring Controller", "Express Controller", "Query data historis dan status real-time")
        Component(ws_hub, "WebSocket Hub", "Socket.io", "Broadcast data real-time ke connected clients")
        Component(reading_svc, "Reading Service Layer", "Business Logic", "Proses, validasi, dan simpan pembacaan sensor")
        Component(reading_repo, "Reading Repository", "Mongoose", "CRUD ke MongoDB charger_readings collection")
        Component(session_repo, "Session Repository", "Mongoose", "Kelola sesi pengisian aktif")
        Component(event_publisher, "Event Publisher", "amqplib", "Publish charger.session.ended event")
        Component(alert_engine, "Alert Engine", "Business Logic", "Deteksi anomali: overheat, undervoltage, dsb.")
    }

    ContainerDb(mongo, "MongoDB Monitoring DB")
    Container_Ext(rmq_ext3, "RabbitMQ")
    System_Ext(hw, "Charging Hardware")

    Rel(hw, ocpp_handler, "OCPP WebSocket")
    Rel(ocpp_handler, reading_svc, "Forward data")
    Rel(reading_svc, reading_repo, "Simpan")
    Rel(reading_svc, ws_hub, "Broadcast real-time")
    Rel(reading_svc, alert_engine, "Cek anomali")
    Rel(alert_engine, event_publisher, "Publish alert event")
    Rel(monitor_ctrl, reading_repo, "Query historis")
    Rel(monitor_ctrl, session_repo, "Query sesi aktif")
    Rel(reading_repo, mongo, "MongoDB query")
    Rel(event_publisher, rmq_ext3, "AMQP publish")
```

---

## 3.8 Notification Service — Komponen Internal

```mermaid
C4Component
    title Notification Service — Components

    Container_Boundary(ns, "Notification Service") {
        Component(event_consumer, "Event Consumer", "amqplib", "Subscribe ke semua event yang perlu notifikasi")
        Component(notif_router, "Notification Router", "Business Logic", "Routing event ke handler yang sesuai")
        Component(email_handler, "Email Handler", "SendGrid SDK", "Kirim notifikasi email dengan template")
        Component(sms_handler, "SMS Handler", "Twilio SDK", "Kirim notifikasi SMS")
        Component(push_handler, "Push Handler", "Firebase FCM", "Kirim push notification mobile (future)")
        Component(template_engine, "Template Engine", "Handlebars", "Render template notifikasi")
        Component(retry_mgr, "Retry Manager", "Business Logic", "Retry logic untuk notifikasi gagal")
    }

    Container_Ext(rmq_ext4, "RabbitMQ")
    System_Ext(sg, "SendGrid")
    System_Ext(tw, "Twilio")

    Rel(event_consumer, rmq_ext4, "Subscribe semua exchanges")
    Rel(event_consumer, notif_router, "Forward event")
    Rel(notif_router, email_handler, "Route ke email")
    Rel(notif_router, sms_handler, "Route ke SMS")
    Rel(notif_router, push_handler, "Route ke push")
    Rel(email_handler, template_engine, "Render template")
    Rel(email_handler, sg, "Send via API")
    Rel(sms_handler, tw, "Send via API")
    Rel(email_handler, retry_mgr, "Retry jika gagal")
    Rel(sms_handler, retry_mgr, "Retry jika gagal")
```
