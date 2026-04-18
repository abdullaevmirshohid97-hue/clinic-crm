# Clinic CRM Subdomain Go-Live Checklist

This guide is for launching the Clinic CRM frontend on a subdomain like `app.yourclinic.uz`.

## 1) Prepare the project

From repository root:

```bash
npm install
npm run build -w apps/clinic-app
```

Expected result:
- `apps/clinic-app/dist` is generated
- Build finishes without fatal errors

## 2) Create production environment variables

In `apps/clinic-app`, create/update `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_API_URL=https://api.yourclinic.uz/api/v1
```

Important:
- Do not commit secret keys.
- `VITE_SUPABASE_ANON_KEY` is public key (safe for frontend).

## 3) Deploy frontend (recommended: Vercel)

1. Import repository in Vercel
2. Set **Root Directory** to `apps/clinic-app`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables from step 2 in Vercel Project Settings
6. Run first deployment

## 4) Connect subdomain

In Vercel Project Settings -> Domains:
1. Add domain `app.yourclinic.uz`
2. In your DNS provider create:
   - Type: `CNAME`
   - Host: `app`
   - Value: `cname.vercel-dns.com`
3. Wait for DNS propagation

## 5) SSL and security

- Verify HTTPS opens: `https://app.yourclinic.uz`
- Confirm SSL certificate is valid in browser lock icon
- Force HTTP -> HTTPS redirect in provider settings (if available)

## 6) Smoke test (must pass before go-live)

- Login page loads
- Auth works with valid credentials
- Dashboard opens
- At least one page from each role opens:
  - Reception
  - Nurse
  - Doctor
  - Billing
- Browser refresh on any internal route still works

## 7) Post-launch checks

- Check browser console for runtime errors
- Validate API and Supabase requests are successful
- Check activity logs write successfully
- Monitor first 24 hours for auth/session errors

## Quick rollback

If release has critical issue:
1. Open Vercel Deployments
2. Promote previous stable deployment
3. Re-test login and dashboard

