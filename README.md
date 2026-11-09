# Smart Gate — Sistem Kontrol Akses Gerbang

Aplikasi web admin untuk mengelola akses gerbang RFID. Full-stack: Express.js + PostgreSQL + Vanilla JS.

## Fitur
- ✅ Login/logout admin (cookie session httpOnly)
- ✅ Dashboard statistik akses
- ✅ Manajemen pengguna & kartu RFID
- ✅ Riwayat akses gerbang (filter & pencarian)
- ✅ Kontrol buka/tutup gerbang
- ✅ Responsive design (mobile-friendly)

## Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Supabase)
- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Hosting**: Render.com (free tier)

---

## 🚀 Deploy ke Render.com (Gratis)

### Langkah 1: Buat Database di Supabase

1. Buka [supabase.com](https://supabase.com) → buat akun gratis
2. Klik **New Project** → isi nama project & password database
3. Tunggu project selesai dibuat
4. Buka **Project Settings** → **Database** → scroll ke **Connection string** → pilih **URI**
5. Copy connection string-nya, contoh:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
6. Buka **SQL Editor** di Supabase, paste isi file `database/migrations/001_initial_schema.sql` → klik **Run**
7. Paste isi file `database/migrations/002_admin_sessions.sql` → klik **Run**

### Langkah 2: Push ke GitHub

```bash
cd smart-gate
git init
git add .
git commit -m "Smart Gate ready for deploy"
git remote add origin https://github.com/USERNAME/smart-gate.git
git push -u origin main
```

### Langkah 3: Deploy di Render

1. Buka [render.com](https://render.com) → buat akun gratis (bisa pakai GitHub)
2. Klik **New** → **Web Service**
3. Connect repository GitHub kamu
4. Setting:
   - **Name**: `smart-gate`
   - **Root Directory**: `smart-gate` (kalau repo berisi folder smart-gate)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Tambah **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | *(connection string dari Supabase)* |
   | `NODE_ENV` | `production` |
   | `SESSION_COOKIE_SECURE` | `true` |
   | `SESSION_TTL_HOURS` | `8` |
6. Klik **Deploy**

### Langkah 4: Buat Admin & Seed Data

Setelah deploy berhasil, buka **Shell** di Render dashboard (atau jalankan lokal):

```bash
# Buat akun admin
ADMIN_USERNAME=admin ADMIN_PASSWORD=PasswordKuat123 npm run admin:create

# (Opsional) Isi data contoh
npm run db:seed
```

---

## Jalankan Lokal

1. Install PostgreSQL lokal atau pakai Supabase
2. Copy `.env.example` → `.env`, isi `DATABASE_URL`
3. Install & jalankan:

```bash
npm install
npm run db:init      # buat tabel
npm run db:seed      # isi data contoh (opsional)
npm run dev          # jalankan dengan auto-reload
```

4. Buka `http://localhost:3000`
5. Login: `admin` / `Admin12345678` (kalau pakai seed)

## Scripts

| Script | Fungsi |
|--------|--------|
| `npm start` | Jalankan production server |
| `npm run dev` | Jalankan development (auto-reload) |
| `npm run db:init` | Jalankan migrasi database |
| `npm run db:seed` | Isi data contoh + admin demo |
| `npm run admin:create` | Buat akun admin baru |

## API Endpoints

| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/api/v1/auth/login` | Login admin |
| GET | `/api/v1/auth/me` | Cek session |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/dashboard/summary` | Statistik dashboard |
| GET | `/api/v1/users` | Daftar pengguna |
| POST | `/api/v1/users` | Tambah pengguna |
| GET | `/api/v1/access-logs` | Riwayat akses |
| GET | `/api/v1/gate/status` | Status gerbang |
| PATCH | `/api/v1/gate/status` | Buka/tutup gerbang |
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |
