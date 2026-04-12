# Enterprise Backup Strategy (CTO Level)

Our SaaS platform utilizes a dual-layer backup strategy to ensure 99.99% data durability and point-in-time recovery capabilities.

## Layer 1: Managed Physical Level Backups (Supabase)
For complete disaster recovery, we rely on Supabase's native physical backups (PITR - Point in Time Recovery or Daily Snapshots depending on the plan).
- **Frequency**: Automatic Daily snapshots (default on Supabase Pro).
- **Scope**: Entire Postgres cluster, including schema, roles, and all multi-tenant data.
- **Storage**: Geographically isolated storage managed by AWS/Supabase.
- **Retention**: 7 to 30 days.

## Layer 2: Application-Level Logical Backups (Data Escrow)
To handle granular, per-clinic logical recoveries (e.g. if a clinic admin accidentally deletes their own patients), we employ a BullMQ backup worker (`src/jobs/backup.job.ts`).
- **Frequency**: Scheduled daily via `scheduler.ts`.
- **Scope**: Exports JSON structure of tenant data filtered strictly by `clinic_id`.
- **Storage**: 
  - Standard (< 45MB): Pushed directly to Telegram Ops Channel for immediate offline availability.
  - Large (> 45MB): Uploaded to an isolated partitioned S3 bucket (`supabase.storage.from('backups')`), link sent via Telegram.
- **Compression**: gzip.

### Recovery Procedure
If a clinic requests logical restoration:
1. Locate the `.json.gz` file for `clinic_id` in Telegram or Supabase Storage.
2. Run a customized ETL script to UPSERT records matching the clinic_id back into the live DB.

*Status: Implemented and configured.*
