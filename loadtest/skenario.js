import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE || "http://host.docker.internal:3000/api";

// Akun untuk load test (gunakan beberapa user supaya tidak kena rate limit)
const USERS = [
  { email: "budi.santoso@gmail.com",   password: "Password123!" },
  { email: "siti.rahayu@gmail.com",    password: "Password123!" },
  { email: "admin@ev-charging.id",     password: "Admin123!"    },
];

// Slot ID yang tersedia di stasiun PLN Monas, tanggal 2026-08-27
const SLOT_IDS = [
  "f3282d48-dd43-4d55-a141-2101126c9f0f",
  "09621240-676b-42c0-b020-03d099fb5351",
  "8e844cfd-8469-4b48-9cd8-16f4627a7172",
  "76fa96ba-2ae5-4284-b1e7-d42aa788ae35",
  "408a53e9-f8fe-4240-9592-3d3028cdbd0e",
];

const STATION_ID = "a1b2c3d4-0001-0001-0001-000000000001";

export const options = {
  scenarios: {
    // Skenario Charger EV: 1500 request dalam 60 detik
    serbuan_booking: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { target: 25,  duration: "15s" }, // naik
        { target: 25,  duration: "40s" }, // tahan puncak (~1500 req total)
        { target: 0,   duration: "5s"  }, // reda
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"],  // baseline — belum dioptimasi
    http_req_failed:   ["rate<0.5"],    // toleransi tinggi untuk baseline
  },
};

// Login dan ambil token
function getToken(user) {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { "Content-Type": "application/json" } }
  );
  if (res.status === 200) {
    return res.json("access_token");
  }
  return null;
}

export function setup() {
  // Ambil token untuk semua user
  const tokens = {};
  for (const user of USERS) {
    const token = getToken(user);
    if (token) tokens[user.email] = token;
  }
  return { tokens };
}

export default function (data) {
  const emails = Object.keys(data.tokens);
  if (emails.length === 0) return;

  // Pilih user secara bergantian berdasarkan VU id
  const email = emails[__VU % emails.length];
  const token  = data.tokens[email];
  const headers = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${token}`,
  };

  // 70% POST /bookings (endpoint panas), 30% GET /stations (endpoint baca)
  const r = Math.random();

  if (r < 0.70) {
    // Endpoint panas — POST /bookings
    const slotId = SLOT_IDS[Math.floor(Math.random() * SLOT_IDS.length)];
    const res = http.post(
      `${BASE}/bookings`,
      JSON.stringify({ slot_id: slotId }),
      { headers }
    );
    // 409 = slot sudah dipesan (bukan error server) — ini BENAR
    // 429 = rate limited — wajar untuk baseline
    check(res, {
      "booking: bukan 5xx": (r) => r.status < 500,
    });
  } else {
    // Endpoint baca — GET /stations/:id
    const res = http.get(`${BASE}/stations/${STATION_ID}`, { headers });
    check(res, {
      "stations: 200": (r) => r.status === 200,
    });
  }

  sleep(0.1);
}
