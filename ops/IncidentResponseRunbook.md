# Incident Response Runbook

## Severity Levels

- Sev-1: Full outage or critical data-risk issue
- Sev-2: Major feature degraded for multiple users
- Sev-3: Limited degradation with workaround

## Initial Response Targets

- Sev-1 acknowledge: 10 minutes
- Sev-2 acknowledge: 20 minutes
- Sev-3 acknowledge: 60 minutes

## Command Structure

- Incident Commander: coordinates response and communication
- Technical Lead: drives diagnosis and mitigation
- Communications Owner: updates stakeholders and timeline

## Response Workflow

1. Detect and classify severity.
2. Open incident channel and assign roles.
3. Stabilize first:
   - protect data integrity
   - restore availability using rollback or feature disable
4. Gather evidence:
   - application logs
   - deployment history
   - recent schema or config changes
5. Mitigate and verify service recovery.
6. Close incident after stability period.

## Evidence Checklist

- Timestamp of first alert
- User impact scope
- Last successful deployment hash
- Relevant logs and error signatures
- Mitigation action and completion time

## Communication Cadence

- Sev-1: status update every 15 minutes
- Sev-2: status update every 30 minutes
- Sev-3: status update every 60 minutes

## Post-Incident Review

Complete a blameless postmortem within 48 hours:

- what happened
- why detection/containment succeeded or failed
- corrective and preventive actions
- owner and deadline for each action item
