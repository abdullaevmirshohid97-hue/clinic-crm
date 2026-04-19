# Security Policy

## Supported Versions

This project applies security fixes on the active `main` branch.

## Vulnerability Reporting

- Report security issues privately to the engineering owner before opening public issues.
- Include reproduction steps, affected module, and potential impact.

## Severity Response Targets

- Critical: triage within 24 hours
- High: triage within 72 hours
- Moderate: triage within 7 days
- Low: best-effort

## Spreadsheet Import Policy

- The application accepts only `.csv` import for pharmacy bulk ingestion.
- MIME type and file size checks are enforced before processing.
- Import flow uses cooldown/rate-limit to reduce abuse attempts.
- Import activity is logged to `audit_log` when available.
- High-risk spreadsheet parsers are excluded from the frontend import path.

## CI Security Gate

- CI runs dependency audit checks on root, backend, and server scopes.
- Build is blocked for new High/Critical vulnerabilities unless explicitly approved.
