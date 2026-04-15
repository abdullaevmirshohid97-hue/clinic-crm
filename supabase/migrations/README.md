# Supabase Migrations

## Migration Order

Run migrations in chronological order:

1. `20260405185031_initial_schema.sql` - Main schema (BIGINT clinic_id, RLS)
2. `20260412230000_tenant_auth.sql` - Tenant auth helpers
3. `20260412233000_analytics_rpc.sql` - Analytics RPCs
4. `20260412234900_plans_subscriptions.sql` - Billing/plans
5. `20260413000200_atomic_rpc.sql` - Atomic operations
6. `20260415000100_laboratory_module.sql` - Lab module
7. `20260415000200_inpatient_module.sql` - Inpatient module
8. `20260415000300_doctor_payouts.sql` - Doctor payouts
9. `20260415000400_pharmacy_journal_fix.sql` - Pharmacy fixes

## Deprecated

- `20240412_initial_schema.sql` - **DO NOT USE**. Old UUID-based schema, kept for reference only.

## Notes

- All tables use `clinic_id BIGINT` for tenant isolation
- RLS policies use `get_clinic_id()` function which reads from JWT `user_metadata`
- Run `npx supabase db push` to apply migrations to your Supabase project
