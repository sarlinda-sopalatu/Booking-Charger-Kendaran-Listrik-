type Role = 'USER' | 'OPERATOR' | 'ADMIN'

interface OfflineUserRecord {
  id: string
  email: string
  password: string
  name: string
  phone?: string
  ev_plate?: string
  role: Role
}

interface PublicUser {
  id: string
  email: string
  name: string
  phone?: string
  ev_plate?: string
  role: Role
}

interface RegisterData {
  email: string
  password: string
  name: string
  phone?: string
  ev_plate?: string
}

export interface AdminCreateUserData {
  email: string
  password: string
  name: string
  phone?: string
  ev_plate?: string
  role: Role
}

const OFFLINE_USERS_KEY = 'ev-offline-users'
const DEFAULT_PASSWORD = 'Password123!'

const seedUsers: OfflineUserRecord[] = [
  {
    id: 'c1b2c3d4-0003-0001-0001-000000000001',
    email: 'budi.santoso@gmail.com',
    password: DEFAULT_PASSWORD,
    name: 'Budi Santoso',
    phone: '081234567001',
    ev_plate: 'B 1234 EV',
    role: 'USER'
  },
  {
    id: 'c1b2c3d4-0003-0001-0001-000000000002',
    email: 'siti.rahayu@gmail.com',
    password: DEFAULT_PASSWORD,
    name: 'Siti Rahayu',
    phone: '081234567002',
    ev_plate: 'B 5678 EV',
    role: 'USER'
  },
  {
    id: 'c1b2c3d4-0003-0001-0001-000000000003',
    email: 'andi.wijaya@gmail.com',
    password: DEFAULT_PASSWORD,
    name: 'Andi Wijaya',
    phone: '081234567003',
    ev_plate: 'D 9012 EV',
    role: 'USER'
  },
  {
    id: 'c1b2c3d4-0003-0001-0001-000000000004',
    email: 'dewi.kusuma@gmail.com',
    password: DEFAULT_PASSWORD,
    name: 'Dewi Kusuma',
    phone: '081234567004',
    ev_plate: 'L 3456 EV',
    role: 'USER'
  },
  {
    id: 'c1b2c3d4-0003-0001-0001-000000000005',
    email: 'reza.pratama@gmail.com',
    password: DEFAULT_PASSWORD,
    name: 'Reza Pratama',
    phone: '081234567005',
    ev_plate: 'B 7890 EV',
    role: 'USER'
  },
  {
    id: 'c1b2c3d4-0003-0001-0001-000000000006',
    email: 'admin@ev-charging.id',
    password: DEFAULT_PASSWORD,
    name: 'Admin Sistem',
    phone: '081234567000',
    role: 'ADMIN'
  },
  {
    id: 'c1b2c3d4-0003-0001-0001-000000000007',
    email: 'operator.pln@ev-charging.id',
    password: DEFAULT_PASSWORD,
    name: 'Operator PLN',
    phone: '081234567099',
    role: 'OPERATOR'
  }
]

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function toPublicUser(user: OfflineUserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    ev_plate: user.ev_plate,
    role: user.role
  }
}

function readStoredOfflineUsers(): OfflineUserRecord[] {
  try {
    const raw = window.localStorage.getItem(OFFLINE_USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredOfflineUsers(users: OfflineUserRecord[]) {
  window.localStorage.setItem(OFFLINE_USERS_KEY, JSON.stringify(users))
}

function getAllOfflineUsers() {
  const stored = readStoredOfflineUsers()
  const map = new Map<string, OfflineUserRecord>()

  for (const user of seedUsers) {
    map.set(normalizeEmail(user.email), user)
  }

  for (const user of stored) {
    map.set(normalizeEmail(user.email), user)
  }

  return Array.from(map.values())
}

export function authenticateOffline(email: string, password: string): PublicUser | null {
  const targetEmail = normalizeEmail(email)
  const users = getAllOfflineUsers()
  const found = users.find((u) => normalizeEmail(u.email) === targetEmail)
  if (!found) return null
  if (found.password !== password) return null
  return toPublicUser(found)
}

export function registerOffline(data: RegisterData): PublicUser | null {
  const targetEmail = normalizeEmail(data.email)
  const users = getAllOfflineUsers()
  const exists = users.some((u) => normalizeEmail(u.email) === targetEmail)
  if (exists) return null

  const newUser: OfflineUserRecord = {
    id: `offline-user-${Date.now()}`,
    email: targetEmail,
    password: data.password,
    name: data.name,
    phone: data.phone,
    ev_plate: data.ev_plate,
    role: 'USER'
  }

  const stored = readStoredOfflineUsers()
  stored.push(newUser)
  writeStoredOfflineUsers(stored)
  return toPublicUser(newUser)
}

export function listOfflineUsers(): PublicUser[] {
  return getAllOfflineUsers().map(toPublicUser)
}

export function addOfflineUserByAdmin(data: AdminCreateUserData): PublicUser | null {
  const targetEmail = normalizeEmail(data.email)
  const users = getAllOfflineUsers()
  const exists = users.some((u) => normalizeEmail(u.email) === targetEmail)
  if (exists) return null

  const newUser: OfflineUserRecord = {
    id: `offline-user-${Date.now()}`,
    email: targetEmail,
    password: data.password,
    name: data.name,
    phone: data.phone,
    ev_plate: data.ev_plate,
    role: data.role
  }

  const stored = readStoredOfflineUsers()
  stored.push(newUser)
  writeStoredOfflineUsers(stored)
  return toPublicUser(newUser)
}

export function getOfflineSeedPasswordHint() {
  return DEFAULT_PASSWORD
}
