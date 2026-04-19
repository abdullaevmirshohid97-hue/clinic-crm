# Release and Rollback Runbook

## Purpose

This runbook standardizes deployment from staging to production with clear quality gates and rollback criteria.

## Environments

- Development: local and feature branches
- Staging: pre-production validation
- Production: customer-facing environment

## Release Readiness Checklist

- `npm run verify:all` passes on the release branch.
- Security gate passes (`node ./scripts/audit-gate.mjs`).
- Database migrations are reviewed and reversible.
- Required environment variables are present in target environment.
- Release notes are prepared with risk and rollback notes.

## Staging Deployment Procedure

1. Cut release branch from `main`.
2. Deploy release branch to staging.
3. Run smoke checks:
   - clinic app login and dashboard load
   - admin app login and core pages load
   - backend and server health endpoints
4. Validate critical user flows:
   - pharmacy sale flow
   - laboratory result workflow
   - payment transaction write

## Production Deployment Procedure

1. Confirm staging checks are complete.
2. Announce release window to stakeholders.
3. Deploy release artifact to production.
4. Run post-deploy smoke checks in production.
5. Monitor metrics for 30 minutes:
   - error rate
   - p95 latency
   - queue backlog

## Rollback Triggers

Rollback immediately if any of the following occur:

- sustained 5xx error spike
- login or payment flow outage
- data corruption indicators
- critical latency degradation without recovery

## Rollback Procedure

1. Stop further traffic changes.
2. Redeploy previous known-good artifact.
3. Verify core smoke checks.
4. Notify stakeholders that rollback is complete.
5. Create incident record and root-cause task.

## Post-Release Tasks

- Archive release notes with commit range.
- Document observed issues and remediation.
- Update risk register if new residual risks exist.
