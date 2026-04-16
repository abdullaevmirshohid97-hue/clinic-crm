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
- `backend/src/index.ts` - Backend entry point
- `supabase/migrations/` - Database schema migrations
- `supabase/functions/` - Deno edge functions

## Development

### Running the App
```bash
npm run dev:clinic    # Start clinic app (port 5000)
npm run dev:admin     # Start admin app (port 5300)
npm run dev:backend   # Start backend
```

The main workflow `Start application` runs `npm run dev:clinic` on port 5000.

## Deployment
Configured as a static site deployment:
- Build: `npm run build -w apps/clinic-app`
- Output: `apps/clinic-app/dist`

## Environment Variables
Requires Supabase credentials (see `.env` files in respective app directories):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
