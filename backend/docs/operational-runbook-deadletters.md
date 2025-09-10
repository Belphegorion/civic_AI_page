# Operational Runbook — Dead Letters

## Purpose
When jobs exhaust retries they are persisted into the `DeadLetter` collection. This doc explains triage & remediation.

## Triage
- Inspect `DeadLetter` doc fields: `jobId`, `name`, `data`, `failedReason`, `attemptsMade`.
- If `failedReason` indicates transient issue (network, external API), requeue.
- If `failedReason` indicates bad payload or code bug, escalate to engineering and attach dead-letter JSON.

## Requeue
- Use admin API: `POST /api/deadletters/:id/requeue` (staff/admin).
- This pushes a new job with limited retries and deletes the dead-letter document.

## Best practices
- Fix root cause before requeueing.
- Limit requeues to avoid repeated failures.

## Monitoring & Alerts
- Configure Prometheus alerts for: high failed-rate, large queue waiting, dead-letter > 0.
- Notify on-call via Slack/PagerDuty when alerts fire.
