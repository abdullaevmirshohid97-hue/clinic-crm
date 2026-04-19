# Governance and Compliance Baseline

## Governance Model

- Service owner must be assigned per major module.
- All production-impacting changes require PR review and passing CI.
- Architectural changes require an ADR in `ops/`.

## Change Management

- Required checks:
  - `verify:all`
  - security audit gate
- Release requires checklist completion from `ops/ReleaseRunbook.md`.

## Compliance Controls (Baseline)

- Data access is role-based (least privilege).
- Security-relevant actions must be auditable (`audit_log` where supported).
- Backup and recovery process is documented in `ops/BackupStrategy.md`.
- Incident handling follows `ops/IncidentResponseRunbook.md`.

## Security Operations

- High/Critical dependency vulnerabilities block CI.
- Exceptions require written approval and expiry date.
- Secrets must not be committed to repository files.

## Evidence Artifacts

- CI run logs for verification and audit gates
- Release checklists and change records
- Incident timeline and postmortem outputs
