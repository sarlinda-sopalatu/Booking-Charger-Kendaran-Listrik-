-- =============================================================================
-- seeds/station-service/seed_ev_vehicles.sql
-- Informasi Kendaraan Listrik yang Tersedia di Indonesia
-- Data ini disimpan sebagai referensi tipe konektor yang kompatibel
-- =============================================================================

CREATE TABLE IF NOT EXISTS ev_vehicles (
  id              SERIAL PRIMARY KEY,
  brand           VARCHAR(100) NOT NULL,
  model           VARCHAR(100) NOT NULL,
  year            INTEGER NOT NULL,
  connector_type  VARCHAR(20) NOT NULL,
  battery_kwh     DECIMAL(6,1) NOT NULL,
  range_km        INTEGER NOT NULL,
  max_charge_kw   DECIMAL(6,1) NOT NULL,
  charge_time_hrs DECIMAL(4,1),
  price_idr       BIGINT,
  image_url       TEXT,
  description     TEXT
);

INSERT INTO ev_vehicles (brand, model, year, connector_type, battery_kwh, range_km, max_charge_kw, charge_time_hrs, price_idr, image_url, description) VALUES

-- =========================================================================
-- HYUNDAI
-- =========================================================================
(
  'Hyundai', 'IONIQ 5 Standard Range', 2024,
  'DC_CCS2', 58.0, 384, 125.0, 0.3,
  809200000,
  'https://imgcdn.oto.com/medium/gallery/color/15/2605/hyundai-ioniq-5-color-751349.jpg',
  'Mobil listrik tipe crossover dengan baterai 58 kWh. Jarak tempuh 384 km (AER). Tenaga 168 hp (125 kW). Akselerasi 0-100 km/h dalam 8.5 detik. Pengisian cepat 10-80% sekitar 18 menit. Tersedia varian Prime (Rp809,2 juta) dan Signature (Rp873,9 juta). Fitur Hyundai SmartSense lengkap.'
),
(
  'Hyundai', 'IONIQ 5 Long Range AWD', 2024,
  'DC_CCS2', 72.6, 451, 220.0, 0.3,
  851500000,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYgLJJIoDb74GWZ01XZXnjyjWtxKKWKbr80YS9bF52a3idF5w0qZ0xaNB0&s=10',
  'Mobil listrik dengan baterai 72.6 kWh. Jarak tempuh 451-481 km. Torsi maksimal 350 Nm. Fitur Vehicle-to-Load (V2L) daya 3.6 kW. Teknologi Hyundai Bluelink. Varian Prime Long Range (Rp851,5 juta) dan Signature Long Range (Rp925,6 juta).'
),
(
  'Hyundai', 'IONIQ 6', 2024,
  'DC_CCS2', 77.4, 519, 239.0, 0.3,
  1200000000,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSKqTgwXXiwcWeARBd5CI9rqOZH6IBaEuq6jnNgXD3amg&s=10',
  'Sedan listrik streamliner aerodinamis berbasis E-GMP. Tenaga 326 PS (239 kW), torsi 605 Nm, AWD. Akselerasi 0-100 km/h dalam 5.1 detik. Jarak tempuh 519-610 km. Koefisien drag 0.21. Fitur V2L 3.6 kW, layar 12.3 inci ganda, audio Bose, Hyundai SmartSense. Harga sekitar Rp1,2 miliar.'
),
(
  'Hyundai', 'Kona Electric', 2024,
  'AC_TYPE2', 48.9, 448, 100.0, 1.0,
  565250000,
  'https://imgcdn.oto.com/medium/gallery/exterior/15/2962/hyundai-kona-electric-88427.jpg',
  'SUV listrik 5 penumpang. Tersedia Standard Range (48.9 kWh, 448 km) dan Long Range (66 kWh, 549-602 km). Tenaga 154-217 hp, torsi 255 Nm. Pengisian di SPKLU 100 kW kurang dari 1 jam. Baterai diproduksi lokal oleh PT HLI Green Power. Harga Rp565,25 juta - Rp689,55 juta.'
),

-- =========================================================================
-- WULING
-- =========================================================================
(
  'Wuling', 'Air EV Standard Range', 2024,
  'AC_TYPE2', 18.0, 200, 6.6, 8.0,
  110000000,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFM_PmsDPXMsqjLY54YacBXwe_5Pa1fMUftvRIUY8NSg&s=10',
  'Mobil listrik mungil 4 penumpang 2 pintu. Baterai 18-25 kWh, jarak tempuh 200 km. Motor 30 kW. Pengisian daya rumah 8-11 jam. Harga bekas 2024 sekitar Rp110-170 juta tergantung kondisi.'
),
(
  'Wuling', 'Air EV Long Range', 2024,
  'AC_TYPE2', 26.7, 300, 6.6, 4.5,
  307500000,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsKEA-6AJOCoD1iE8XRR7f8RXO_jYjTHZXZq-efZDmyXNawQAJIEeHGBTb&s=10',
  'Mobil listrik mini baterai 26.7 kWh, jarak tempuh 300 km. Tenaga 30 kW (40.2 HP), torsi 110 Nm. Mudah dikendarai di jalan sempit kota. Fitur keselamatan ABS, EBD, ESC. Harga Rp307,5 juta - Rp324,4 juta OTR Jakarta.'
),
(
  'Wuling', 'BinguoEV', 2024,
  'AC_TYPE2', 31.9, 333, 40.0, 0.6,
  289000000,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjL--1oJU--4jztskCg9TNtTAUq-rAu3IMqNUjS4cGqA&s',
  'Mobil listrik bergaya retro modern. Baterai MAGIC Battery 31.9 kWh, jarak tempuh 333 km. Tenaga 67 dk, torsi 150 Nm. Pengisian cepat 30-80% hanya 35 menit. Harga Rp289 juta - Rp319 juta.'
),

-- =========================================================================
-- BYD
-- =========================================================================
(
  'BYD', 'Atto 3', 2024,
  'DC_CCS2', 49.92, 410, 88.0, 0.7,
  415000000,
  'https://www.byd.com/material/byd-site/id/product/atto3/atto3-section1-pc.png',
  'SUV listrik BYD dengan baterai 49.92-60.48 kWh, jarak tempuh 410-480 km. Layar sentuh 15.6 inci. Fitur ADAS lengkap. Varian Advanced Plus (Rp415 juta) dan Superior Extended Range (Rp520 juta).'
),
(
  'BYD', 'Dolphin', 2024,
  'DC_CCS2', 44.9, 410, 60.0, 0.8,
  369000000,
  'https://www.byd.com/material/byd-site/id/models/products-dolphin/product-dolphin-web.jpg',
  'Hatchback listrik 5 penumpang. Varian Dynamic (70 kW, 410 km, Rp369 juta) dan Premium (150 kW, 490 km, Rp429 juta). Platform e-Platform 3.0 dengan Blade Battery. Fitur ADAS, V2L, kamera 360 derajat, layar putar pintar.'
),
(
  'BYD', 'Seal', 2024,
  'DC_CCS2', 82.56, 650, 150.0, 0.5,
  639000000,
  'https://www.byd.com/material/byd-site/id/product/seal/seal-section1.png',
  'Sedan listrik sporty 5 penumpang. Platform e-Platform 3.0, Blade Battery 82.56 kWh. Varian Premium (230 kW, 650 km, Rp639 juta) dan Performance AWD (390 kW/530 HP, 580 km, Rp750 juta). Akselerasi 3.8-5.9 detik. Layar rotasi 15.6 inci, ADAS lengkap, koefisien drag 0.219.'
),
(
  'BYD', 'Seal U', 2024,
  'DC_CCS2', 87.0, 500, 150.0, 0.5,
  849000000,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_W6Ns8tyBsNJ5g1ZZsIHOv4eXDNZEiRBtSi3YS0khuh_-hm5WCPALmQQ&s=10',
  'SUV keluarga listrik murni (EV) dan plug-in hybrid (DM-i). Platform e-Platform 3.0, Blade Battery LFP 87 kWh. Tenaga 160 kW (218 hp), torsi 330 Nm. Ground clearance 19 cm, bagasi 425 liter. Fitur head-up display, Apple CarPlay, Android Auto, Blind Spot Detection, ICC.'
),

-- =========================================================================
-- TESLA
-- =========================================================================
(
  'Tesla', 'Model 3 Standard Range', 2024,
  'DC_CCS2', 60.9, 534, 170.0, 0.4,
  850000000,
  'https://hips.hearstapps.com/hmg-prod/images/2024-tesla-model-3-long-range-rwd-120-66feb66119c63.jpg?crop=0.571xw:0.479xh;0.146xw,0.416xh&resize=1200:*',
  'Sedan listrik desain Highland terbaru. Baterai 60.9 kWh, jarak tempuh 534 km (WLTP). Tenaga 245-257 hp, akselerasi 0-100 km/h dalam 6.1 detik. RWD. Interior minimalis, kursi depan berventilasi, kaca akustik double-glazed, layar hiburan penumpang belakang.'
),
(
  'Tesla', 'Model 3 Long Range AWD', 2024,
  'DC_CCS2', 79.5, 626, 250.0, 0.3,
  1050000000,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROS5UGshgy6EbjaoWxSHTEpm8U2bobcaJBDDYKXb7rZFhbOrSkZcmaGR8q&s=10',
  'Sedan listrik AWD dual motor. Baterai 79.5 kWh, jarak tempuh 549-626 km. Tenaga 449 hp, akselerasi 0-100 km/h dalam 4.4 detik. Dimensi 4694x1850x1443 mm, bagasi 425 liter.'
),
(
  'Tesla', 'Model Y Standard Range', 2024,
  'DC_CCS2', 70.0, 534, 175.0, 0.5,
  620000000,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUFARMT2eUQXg_ehICvhTCGGcdgNYRa54ncMaZ2j9lvLWYWAgOjdIFESQ&s=10',
  'SUV listrik RWD motor tunggal. Baterai LFP 70 kWh, jarak tempuh 534 km (WLTP). Pengisian cepat 175 kW, 10-80% dalam 30 menit. Akselerasi 0-100 km/h 5.3-6.9 detik. Layar sentuh 15.4 inci, kursi kain dan vegan leather, atap kaca panoramic.'
),

-- =========================================================================
-- KIA
-- =========================================================================
(
  'Kia', 'EV6 Standard Range', 2024,
  'DC_CCS2', 63.0, 381, 100.0, 0.6,
  789000000,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQv9KNRY5wK17kUxrcPIUmYbiIwrvVtuYbl1pss6w4BQR6cuuzyKjPOPDw&s=10',
  'Crossover listrik RWD baterai 63 kWh, jarak tempuh 381 km. Arsitektur pengisian cepat 800V. Estimasi jarak nyata 245-510 km tergantung kondisi jalan dan mode berkendara.'
),
(
  'Kia', 'EV6 Long Range AWD', 2024,
  'DC_CCS2', 84.0, 475, 240.0, 0.3,
  989000000,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-xDzVH6ME9geVzOG9oJ6fn_Uip4ElRsZCYg-4az-DrWjjjy3uEadjSqs&s=10',
  'SUV listrik AWD dual motor. Baterai 84 kWh, jarak tempuh 475-513 km. Tenaga 320-325 hp, torsi 605 Nm. Akselerasi 0-100 km/h dalam 4.5 detik. Arsitektur 800V pengisian super cepat. Mode berkendara Eco/Normal/Sport/Snow, Highway Driving Assist.'
),

-- =========================================================================
-- NISSAN
-- =========================================================================
(
  'Nissan', 'Leaf', 2023,
  'DC_CHAdeMO', 40.0, 311, 50.0, 1.0,
  738000000,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/2018_Nissan_Leaf_Tekna_Front.jpg/1280px-2018_Nissan_Leaf_Tekna_Front.jpg',
  'Hatchback listrik 5 pintu, kendaraan listrik produksi massal pertama di dunia. Baterai 40 kWh, jarak tempuh 311 km, tenaga 148 hp. Fitur e-Pedal (gas dan rem satu pedal), kamera 360 derajat, Apple CarPlay, Android Auto. Harga Rp738-740 juta.'
),
(
  'Nissan', 'Ariya', 2024,
  'DC_CCS2', 87.0, 490, 130.0, 0.7,
  999000000,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/2023_Nissan_Ariya_Advance_Front.jpg/1280px-2023_Nissan_Ariya_Advance_Front.jpg',
  'SUV crossover listrik 5 kursi. Baterai 63-87 kWh, jarak tempuh 490 km. Tenaga 214-389 dk. Pilihan FWD atau AWD e-4ORCE. Layar ganda 12.3 inci, ProPILOT Assist semi-otonom, kabin luas lantai rata. Dimensi 4646x2172 mm.'
),

-- =========================================================================
-- BMW
-- =========================================================================
(
  'BMW', 'iX1', 2024,
  'DC_CCS2', 64.8, 477, 130.0, 0.5,
  1337000000,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwQT7wqtLXq5irdP1z6UvMFj2KygaLfhvcCvHo9ubEy0Moqpb-Jnh8W4E&s=10',
  'SUV listrik kompak luxury FWD. Baterai 64.8 kWh, jarak tempuh 430-477 km. Tenaga 204-240 hp, torsi 250 Nm. Akselerasi 0-100 km/h 8.2-8.6 detik. DC fast charging 130 kW (10-80% dalam 30 menit). BMW Curved Display, panoramic sunroof, audio Harman Kardon, Parking Assistant 360 derajat. Harga Rp1,337-1,379 miliar.'
),
(
  'BMW', 'i4', 2024,
  'DC_CCS2', 83.9, 580, 200.0, 0.4,
  1800000000,
  'https://imgcdn.oto.com/large/gallery/exterior/3/2371/bmw-i4-front-angle-low-view-120956.jpg',
  'Sedan Gran Coupe listrik 5 kursi RWD. Baterai 66 kWh, jarak tempuh 400-580 km. Tenaga 281-340 hp, torsi 400 Nm. Akselerasi 0-100 km/h 5.7-6.0 detik. BMW Curved Display, desain aerodinamis kidney grille tertutup, bagasi elektrik. Harga mulai Rp1,8 miliar.'
),

-- =========================================================================
-- MITSUBISHI
-- =========================================================================
(
  'Mitsubishi', 'Outlander PHEV', 2024,
  'DC_CHAdeMO', 13.8, 54, 30.0, 0.8,
  1300000000,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSxL74LBz-ddwQnASEnoKK--libh2XvZ8XSa8VXrcjEzWFeGNj-VuKkIak&s=10',
  'SUV Plug-in Hybrid mesin bensin 2.4L + dual motor listrik. Baterai 13.8 kWh, jarak tempuh EV 50-54 km. Sistem S-AWC 4WD. Mode EV/Series Hybrid/Parallel Hybrid. Fitur V2H (Vehicle-to-Home). FCM, ACC, 7 airbag. Harga sekitar Rp1,3 miliar.'
);
