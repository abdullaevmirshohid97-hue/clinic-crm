# Monitoring and SLO Baseline

## Objective

Define minimum operational metrics and alert thresholds to keep service quality visible and actionable.

## Core SLOs

- API availability: 99.9% monthly
- API p95 latency: under 500ms for core endpoints
- Error budget: 0.1% monthly downtime

## Required Dashboards

- API health:
  - request count
  - 4xx/5xx rate
  - p50/p95/p99 latency
- Queue health:
  - job backlog depth
  - job failure count
  - retry rate
- Database health:
  - slow query count
  - connection saturation

## Alert Thresholds

- Critical:
  - 5xx rate > 5% for 5 minutes
  - API unavailability > 2 minutes
- Warning:
  - p95 latency > 800ms for 10 minutes
  - queue backlog above normal baseline for 15 minutes

## On-Call Expectations

- Acknowledge critical alerts within 10 minutes.
- Follow Incident Response Runbook for Sev-1/Sev-2.
- Record every critical alert outcome in incident log.

## Review Cadence

- Weekly: review alert noise and false positives
- Sprint-end: review SLO trends and error budget burn
- Monthly: revise thresholds based on production behavior
