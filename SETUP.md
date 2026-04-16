# CLARY — O'rnatish Qo'llanmasi / Setup Guide

> **Uzbek** qo'llanmasi quyida | **English** guide further below

---

## 🇺🇿 O'zbek tilida

### Talablar
- [Node.js](https://nodejs.org/) v18 yoki undan yuqori
- [Supabase](https://supabase.com/) hisobi (bepul)
- `psql` (PostgreSQL client) — migration uchun kerak
  - **Mac:** `brew install postgresql`
  - **Ubuntu/Debian:** `sudo apt install postgresql-client`
  - **Windows:** [PostgreSQL installer](https://www.postgresql.org/download/windows/) orqali
  - **Replit:** avtomatik o'rnatilgan ✓

---

### 1-qadam — Supabase loyihasini yaratish

1. [supabase.com](https://supabase.com) ga kiring va yangi loyiha yarating
2. Loyiha yaratilgandan so'ng **Project Settings** ga o'ting

---

### 2-qadam — Credentials (kirish ma'lumotlari) olish

Sizga **3 ta qiymat** kerak bo'ladi:

#### `VITE_SUPABASE_URL` va `VITE_SUPABASE_ANON_KEY`
> **Project Settings → API** bo'limidan oling

| Qiymat | Qayerdan |
|---|---|
| `VITE_SUPABASE_URL` | "Project URL" maydoni |
| `VITE_SUPABASE_ANON_KEY` | "anon public" kaliti |

#### `SUPABASE_DB_URL` — Migration uchun to'g'ridan-to'g'ri ulanish

> **Project Settings → Database → Connection string** bo'limiga o'ting

> ⚠️ **MUHIM:** "Display connection pooler" tugmachasini **O'CHIRING** (off holati)

To'g'ri URL formati:
```
postgresql://postgres:HAQIQIY_PAROLINGIZ@db.LOYIHA_ID.supabase.co:5432/postgres
```

Noto'g'ri (pooler) URL quyidagicha ko'rinadi (ISHLATMANG):
```
postgresql://postgres.xyz:parol@aws-0-region.pooler.supabase.com:6543/postgres
```

---

### 3-qadam — Environment o'zgaruvchilarini sozlash

**Replit da ishlayotgan bo'lsangiz** — Secrets panelidan kiriting:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL`

**Lokal kompyuterda ishlayotgan bo'lsangiz** — `.env` fayl yarating:
```bash
cp .env.example .env
```
Keyin `.env` faylini oching va qiymatlarni to'ldiring.

---

### 4-qadam — Kutubxonalarni o'rnatish

```bash
npm install
```

---

### 5-qadam — Migrationlarni ishlatish

```bash
npm run migrate
```

Bu buyruq barcha **9 ta** migration faylni Supabase bazangizga yuboradi:

| Migration | Nima qiladi |
|---|---|
| `initial_schema` | Asosiy jadvallar (bemorlar, shifokorlar, klinikalar) |
| `tenant_auth` | Ko'p ijarachilik autentifikatsiyasi va RLS |
| `analytics_rpc` | Analitika funksiyalari |
| `plans_subscriptions` | Rejalar va obunalar |
| `atomic_rpc` | Atomik RPC funksiyalari |
| `laboratory_module` | Laboratoriya moduli |
| `inpatient_module` | Statsionar moduli |
| `doctor_payouts` | Shifokor to'lovlari |
| `pharmacy_journal_fix` | Dorixona jurnali tuzatmasi |

---

### 6-qadam — Ilovani ishga tushirish

```bash
npm run dev:clinic
```

Ilova `http://localhost:5000` da ishga tushadi.

**Replit da** — "Start application" workflow avtomatik ishga tushadi.

---

### Muammolar va yechimlar

| Muamlo | Sabab | Yechim |
|---|---|---|
| Bo'sh sahifa | `.env` sozlanmagan | 2 va 3-qadamlarni bajaring |
| `tls error` migration da | `SUPABASE_DB_URL` pooler URL | 2-qadamdagi ⚠️ ga qarang |
| `Name not known` xatosi | Pooler hostname ishlatilgan | To'g'ridan-to'g'ri DB URL ni oling |
| `Password for user` so'rovi | URL da parol yo'q | URL ga haqiqiy parolni qo'shing |

---
---

## 🇬🇧 English

### Requirements
- [Node.js](https://nodejs.org/) v18 or higher
- [Supabase](https://supabase.com/) account (free tier works)
- `psql` (PostgreSQL client) — needed for running migrations
  - **Mac:** `brew install postgresql`
  - **Ubuntu/Debian:** `sudo apt install postgresql-client`
  - **Windows:** [PostgreSQL installer](https://www.postgresql.org/download/windows/)
  - **Replit:** pre-installed ✓

---

### Step 1 — Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) and create a new project
2. Once created, navigate to **Project Settings**

---

### Step 2 — Gather your credentials

You need **3 values**:

#### `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
> From **Project Settings → API**

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | "Project URL" field |
| `VITE_SUPABASE_ANON_KEY` | "anon public" key |

#### `SUPABASE_DB_URL` — Direct connection for migrations

> Go to **Project Settings → Database → Connection string**

> ⚠️ **IMPORTANT:** Make sure "Display connection pooler" is **turned OFF**

Correct URL format:
```
postgresql://postgres:YOUR_REAL_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres
```

Wrong (pooler) URL — do NOT use for migrations:
```
postgresql://postgres.xyz:password@aws-0-region.pooler.supabase.com:6543/postgres
```

---

### Step 3 — Set environment variables

**On Replit** — add them via the Secrets panel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL`

**Locally** — create a `.env` file:
```bash
cp .env.example .env
```
Then open `.env` and fill in your values.

---

### Step 4 — Install dependencies

```bash
npm install
```

---

### Step 5 — Run database migrations

```bash
npm run migrate
```

This applies all **9 migration files** to your Supabase database:

| Migration | What it does |
|---|---|
| `initial_schema` | Core tables (patients, doctors, clinics) |
| `tenant_auth` | Multi-tenant auth & Row Level Security |
| `analytics_rpc` | Analytics RPC functions |
| `plans_subscriptions` | Plans & subscription management |
| `atomic_rpc` | Atomic RPC functions |
| `laboratory_module` | Laboratory module tables |
| `inpatient_module` | Inpatient (ward) module tables |
| `doctor_payouts` | Doctor payout tracking |
| `pharmacy_journal_fix` | Pharmacy journal fix |

---

### Step 6 — Start the app

```bash
npm run dev:clinic
```

The app will be available at `http://localhost:5000`.

**On Replit** — the "Start application" workflow starts automatically.

---

### Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| Blank white page | Supabase not configured | Complete steps 2 and 3 |
| `tls error` on migrate | `SUPABASE_DB_URL` is a pooler URL | See ⚠️ note in step 2 |
| `Name or service not known` | Pooler hostname used | Get the direct DB URL |
| `Password for user` prompt | Password missing from URL | Add your real password into the URL |

---

### Available scripts

| Command | Description |
|---|---|
| `npm run dev:clinic` | Start clinic app (port 5000) |
| `npm run dev:admin` | Start admin app (port 5300) |
| `npm run migrate` | Push all migrations to Supabase |
| `npm run build` | Build all apps for production |
