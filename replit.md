# CLARY - SaaS Platform for Healthcare

## Overview
CLARY is a comprehensive clinic management SaaS platform designed for clinics and medical centers. It supports multi-tenancy and includes modules for patient management, billing, pharmacy, laboratory, and administration.

## Architecture

### Monorepo Structure
This is an npm workspace monorepo with the following apps:
- `apps/clinic-app` - Main React frontend for clinic staff/doctors (port 5000 in dev)
- `apps/admin-app` - Admin React frontend for platform super-admins (port 5300)
- `apps/backend` - Lightweight Express backend (alternative)
- `backend/` - Primary Node.js/Express backend with BullMQ, Redis

### Tech Stack
- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: CSS modules + custom theming
- **State**: React Context
- **i18n**: Custom internationalization (English, Russian, Uzbek)
- **Backend**: Node.js + Express v5 + TypeScript
- **Database/BaaS**: Supabase (PostgreSQL + Auth + RLS)
- **Queue**: BullMQ + Redis
- **Validation**: Zod
- **Security**: Helmet, CORS, Express Rate Limit
- **Logging**: Pino

### Key Files
- `apps/clinic-app/src/main.tsx` - Clinic app entry point
- `apps/clinic-app/vite.config.ts` - Vite config (port 5000, host 0.0.0.0)
- `apps/clinic-app/src/lib/supabase.ts` - Supabase client
- `backend/src/index.ts` - Backend entry point
- `supabase/config.toml` - Supabase CLI configuration
- `supabase/migrations/` - Database schema migrations (9 files)
- `supabase/functions/` - Deno edge functions
- `scripts/migrate.sh` - Migration runner script

## Development

### Running the App
```bash
npm run dev:clinic    # Start clinic app (port 5000)
npm run dev:admin     # Start admin app (port 5300)
npm run dev:backend   # Start backend
```

The main workflow `Start application` runs `npm run dev:clinic` on port 5000.

### Running Database Migrations
```bash
npm run migrate       # Push all migrations to remote Supabase
```

Requires `.env` file with `SUPABASE_DB_URL` set.

## Environment Setup

1. Copy `.env.example` to `.env` in the project root
2. Copy `apps/clinic-app/.env.example` to `apps/clinic-app/.env`
3. Fill in the following values:

| Variable | Source | Used for |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase > Project Settings > API | Frontend Supabase client |
| `VITE_SUPABASE_ANON_KEY` | Supabase > Project Settings > API | Frontend Supabase client |
| `SUPABASE_DB_URL` | Supabase > Project Settings > Database > URI | Running migrations |

## Migrations

9 migration files in `supabase/migrations/`:
1. `20260405185031_initial_schema.sql` - Core tables (patients, doctors, clinics)
2. `20260412230000_tenant_auth.sql` - Tenant authentication & RLS
3. `20260412233000_analytics_rpc.sql` - Analytics RPC functions
4. `20260412234900_plans_subscriptions.sql` - Plans & subscriptions
5. `20260413000200_atomic_rpc.sql` - Atomic RPC functions
6. `20260415000100_laboratory_module.sql` - Laboratory module
7. `20260415000200_inpatient_module.sql` - Inpatient module
8. `20260415000300_doctor_payouts.sql` - Doctor payouts
9. `20260415000400_pharmacy_journal_fix.sql` - Pharmacy journal fix

## Deployment
Configured as a static site deployment:
- Build: `npm run build -w apps/clinic-app`
- Output: `apps/clinic-app/dist`
