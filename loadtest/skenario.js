import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const errorRate = new Rate('error_rate');
const reqDuration = new Trend('req_duration');

export const options = {
  scenarios: {
    serbuan: {
      executor: 'constant-arrival-rate',
      rate: 25,           // 25 req/detik
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    error_rate: ['rate<0.1'],
  },
};

const BASE_URL = 'http://host.docker.internal:3000/api';

const CREDENTIALS = [
  { email: 'budi.santoso@gmail.com', password: 'Password123!' },
  { email: 'admin@ev-charging.id',   password: 'Admin123!' },
];

// Login sekali di setup, token dibagikan ke semua VU
export function setup() {
  const tokens = [];

  for (const cred of CREDENTIALS) {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: cred.email, password: cred.password }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const ok = check(res, { 'setup login ok': (r) => r.status === 200 });
    if (ok) {
      const token = res.json('access_token') || res.json('token') || res.json('accessToken');
      tokens.push(token);
    } else {
      console.error(`Login gagal untuk ${cred.email}: ${res.status} ${res.body}`);
    }
  }

  if (tokens.length === 0) {
    throw new Error('Tidak ada token yang berhasil didapat saat setup!');
  }

  return { tokens };
}

export default function (data) {
  const token = data.tokens[__VU % data.tokens.length];
  const headers = { Authorization: `Bearer ${token}` };

  // 1. List stations
  const stationsRes = http.get(`${BASE_URL}/stations`, { headers });
  reqDuration.add(stationsRes.timings.duration);
  const s1 = check(stationsRes, { 'stations 200': (r) => r.status === 200 });
  if (!s1) { console.log(`stations FAIL ${stationsRes.status}: ${stationsRes.body.substring(0, 120)}`); }
  errorRate.add(!s1);

  // 2. List bookings
  const bookingsRes = http.get(`${BASE_URL}/bookings`, { headers });
  reqDuration.add(bookingsRes.timings.duration);
  const s2 = check(bookingsRes, { 'bookings 200 or 403': (r) => r.status === 200 || r.status === 403 });
  errorRate.add(!s2);

  // 3. Profile user
  const profileRes = http.get(`${BASE_URL}/users/me`, { headers });
  reqDuration.add(profileRes.timings.duration);
  const s3 = check(profileRes, { 'profile 200': (r) => r.status === 200 });
  errorRate.add(!s3);

  sleep(1);
}
