# DevOps & Infrastructure Audit — Desk Imperial

**Date:** 2026-04-26
**Auditor:** Infrastructure Specialist Agent
**Scope:** Docker, CI/CD, environments, secrets, deployment, rollback, health checks, backups, disaster recovery

---

## Summary

Desk Imperial infrastructure is well-architected for a solo/freelance project. Production runs on Oracle Cloud across 5 VMs with strict separation of concerns (app, ops/builder, database, runner, sentinel). CI is comprehensive with 8 quality/cost gates per PR. Backups use pgBackRest with encrypted S3 offload and weekly restore drills. Key gaps: no documented rollback procedure, Alertmanager alerts have no delivery channel, and the Turborepo pipeline lacks granular input declarations causing unnecessary rebuilds.

---

## Quantitative Evidence

| Metric                 | Value                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Dockerfiles            | 5 (3 Oracle multi-stage, 1 sandbox single-stage, 2 utility)                                                  |
| Docker Compose files   | 9 (local dev, observability, sandbox x2, Oracle production, Oracle DB, Oracle ops, Oracle runner)            |
| CI jobs per PR         | 8 parallel (quality, backend-tests, backend-e2e, frontend-unit, frontend-e2e, security, latency-gate, build) |
| CI timeout budget      | ~111 min total per PR                                                                                        |
| Infrastructure VMs     | 5 (prod, ops/builder, database, runner, sentinel)                                                            |
| Deployment targets     | 2 (Oracle Cloud primary, Railway secondary)                                                                  |
| Backup retention       | 2 full + 7 differential (pgBackRest)                                                                         |
| Backup destination     | Oracle Object Storage (S3-compatible), AES-256-CBC encrypted                                                 |
| Restore drills         | Weekly (Sunday 03:30 UTC), automated                                                                         |
| Observability services | 9 (Alloy, Prometheus, Loki, Tempo, Grafana, Alertmanager, Blackbox, node-exporter, postgres-exporter)        |
| Alert rules            | 14 (7 infrastructure, 5 business, 2 scrape health)                                                           |
| Secrets in repo        | 0 tracked by git (verified via git ls-files)                                                                 |
| Health check depth     | Deep -- DB SELECT + Redis PING                                                                               |

---

## Findings

### OPS-001 — No Documented Rollback Procedure

- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `infra/scripts/oracle-builder-deploy.ps1` deploys with `--force-recreate` and tags images with release timestamps (`desk-imperial-api:YYYYMMddHHmmss`), but no script or README documents how to revert to a prior image or migration state.
- **Impact:** If a deployment introduces a data-corrupting migration or broken build, recovery requires manual SSH + `docker compose up -d` with a known-good tag. Error-prone under pressure.
- **Recommendation:** Add a `rollback.ps1` script that accepts `-Release <timestamp>` and re-deploys the prior tagged image. Document in `infra/oracle/README.md` that Prisma migrations are forward-only and require a restore drill if rollback is needed.
- **Effort:** Small (2-3h)

### OPS-002 — Alertmanager Has No Webhook Delivery

- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `infra/oracle/ops/.env` line 17: `ALERTMANAGER_WEBHOOK_URL=` (empty). Prometheus alert rules are defined (`infra/docker/observability/prometheus/alert.rules.yml:1-143`) but alerts have no delivery channel. No email, Slack, or PagerDuty integration configured.
- **Impact:** The observability stack generates alerts (API down, latency high, service unavailable) but they cannot reach a human. Production issues may go unnoticed until a user reports them.
- **Recommendation:** Configure at minimum a Discord/Slack webhook or SMTP email receiver in Alertmanager. For a solo project, a Telegram bot webhook is low-effort and high-value. Set `ALERTMANAGER_WEBHOOK_URL` in the ops `.env` file.
- **Effort:** Small (1h)

### OPS-003 — Turborepo Pipeline Missing `inputs` Declarations

- **Severity:** Low
- **Confidence:** High
- **Evidence:** `turbo.json:4-21` defines tasks with `dependsOn` and `outputs` but no `inputs` filters. Any file change in any package triggers a full rebuild of all dependent packages, even if the change is to a README or test file.
- **Impact:** Unnecessary rebuilds slow local development and CI feedback. Cache misses increase CI cost and time.
- **Recommendation:** Add `inputs` arrays to `build`, `lint`, `test`, and `typecheck` tasks, scoped to source directories and config files.
- **Effort:** Trivial (0.5h)

### OPS-004 — Local `.env` Files with Real Secrets (On-Disk Risk, Not in Git)

- **Severity:** Low (repo is clean; local hygiene issue)
- **Confidence:** High
- **Evidence:**
  - Root `.env` (not git-tracked, verified) contains real BREVO API key (line 33), Grafana admin password (line 52), SonarQube admin password + CI token (lines 53-54).
  - `infra/oracle/db/.env` (not tracked) contains all DB passwords, S3 access keys, pgBackRest cipher pass.
  - `infra/oracle/ops/.env` (not tracked) contains Grafana password, SonarQube JDBC password, Metabase key.
  - `infra/oracle/runner/.env` (not tracked) contains S3 keys, pgBackRest cipher pass.
  - `.secrets/` directory (not tracked per `.gitignore:43`) contains Oracle Object Storage credentials and Grafana credentials.
- **Impact:** Any process or tool running with filesystem access on the developer's machine can read these secrets. Windows Defender and typical developer workstation hygiene mitigate but do not eliminate this risk.
- **Recommendation:** Use a `.env` manager like `dotenv-vault` or keep production secrets exclusively in a password manager (1Password, Bitwarden) with env-file generation on demand. For the 5-VM Oracle setup, consider Oracle Vault or Git-crypt if sharing with collaborators.
- **Effort:** Medium (2-5h, tooling change)

### OPS-005 — No Pre-Push Hook (Relying Solely on CI)

- **Severity:** Low
- **Confidence:** High
- **Evidence:** `.husky/pre-commit` exists and runs `lint-staged` (line 1). No `pre-push` hook exists. All quality gates (lint, typecheck, tests, security) run only in CI after push to GitHub.
- **Impact:** Developers can push code that fails CI. While CI catches it, this wastes CI minutes and delays feedback. For a solo developer this is minimal impact.
- **Recommendation:** Add a lightweight `pre-push` hook running `npm run quality:preflight` (already defined in `package.json:37`) to catch issues before they hit CI.
- **Effort:** Trivial (0.2h)

### OPS-006 — Railway Web Service Healthcheck Path Points to API

- **Severity:** Low
- **Confidence:** High
- **Evidence:** `apps/web/railway.json:9`: `"healthcheckPath": "/api/v1/health"`. This path is served by the API (NestJS), not by the Next.js web frontend. If API and web are separate Railway services, this healthcheck will fail for the web service.
- **Impact:** Railway may restart the web service if the API is unreachable, even if the web service itself is healthy. In a single-service setup this is benign.
- **Recommendation:** Change to `"healthcheckPath": "/"` or a dedicated Next.js health route for the web service. The root-level `railway.json` correctly uses `/api/v1/health` because it targets the API service.
- **Effort:** Trivial (0.2h)

### OPS-007 — Loki Retention Hardcoded in Config Files

- **Severity:** Low
- **Confidence:** Medium
- **Evidence:** Both `infra/docker/observability/loki/config.yaml:36` and `infra/oracle/ops/loki/config.yaml:36` hardcode `retention_period: 15d`, despite the Oracle ops `.env` having a `LOKI_RETENTION_PERIOD` variable. The ops compose does not pass this to the Loki config.
- **Impact:** 15-day retention is reasonable for a solo project, but hardcoding prevents environment-specific tuning.
- **Recommendation:** Template the Loki config or add environment variable substitution so the `.env` variable is honored.
- **Effort:** Small (0.5h)

### OPS-008 — Development Sandbox Dockerfile is Single-Stage

- **Severity:** Info
- **Confidence:** High
- **Evidence:** `infra/docker/Dockerfile.sandbox:1`: `FROM ubuntu:24.04` -- single stage, no build separation. The Oracle production Dockerfiles (`infra/oracle/docker/api.Dockerfile`, `infra/oracle/docker/web.Dockerfile`) ARE multi-stage (deps -> prod-deps + build -> runtime).
- **Impact:** Minimal -- this is a development sandbox image, not production. Noted for completeness.
- **Recommendation:** No action required. Production Dockerfiles are already well-optimized.
- **Effort:** None

### OPS-009 — No Disaster Recovery Runbook

- **Severity:** Low
- **Confidence:** High
- **Evidence:** `infra/oracle/THREE_VM_STRATEGY.md` documents the architecture. `infra/oracle/db/README.md` documents backup operations. `infra/oracle/runner/README.md` documents restore drills. However, there is no single document describing the end-to-end DR procedure: what to do if `vm-free-01` dies, how to reprovision from scratch, RTO/RPO targets, or a runbook checklist.
- **Impact:** In a real disaster, the developer would need to synthesize knowledge from multiple README files under pressure. For a solo project this is manageable but suboptimal.
- **Recommendation:** Create `infra/oracle/DISASTER_RECOVERY.md` with per-VM recovery procedures, RTO/RPO targets, and a step-by-step checklist for full restore from S3 backups.
- **Effort:** Medium (2-4h)

### OPS-010 — Docker Compose Sandbox Has `read_only: true` with Writable Workspace Mount

- **Severity:** Info
- **Confidence:** Medium
- **Evidence:** `infra/docker/docker-compose.sandbox.yml:27`: `read_only: true` protects the container root filesystem. Line 16 mounts `../..:/workspace` (the host working directory) as writable, and line 19 mounts `sandbox-node-modules:/workspace/node_modules`. This means `/workspace` is writable, partially defeating the read-only constraint.
- **Impact:** None -- the sandbox is a development tool. The writable `/workspace` mount is intentional for development. The `read_only: true` still protects system paths.
- **Recommendation:** No action required. This is a deliberate design choice.
- **Effort:** None

---

## Infrastructure Readiness Score

### 8 / 10

**Rationale:**

- **+2** Multi-stage production Dockerfiles with non-root user, proper layer caching
- **+2** Comprehensive CI pipeline (8 jobs, security scanning, performance gating, OpenAPI contract)
- **+1.5** Full observability stack (metrics, logs, traces, alerting) with business-level SLI alerts
- **+1** Encrypted S3 backups with automated weekly restore drills
- **+1** 5-VM strategy with strict separation of concerns, WireGuard networking, SSH hardening, iptables guard
- **+0.5** Secrets excluded from git (verified), proper .env.example templates
- **-0.5** No documented rollback procedure (manual only)
- **-0.5** Alertmanager has no delivery channel (alerts generated but not sent)
- **(no deduction)** Turborepo inputs, pre-push hook, DR runbook are nice-to-have for a solo project

**Comparison context:** For a solo/freelance developer project, this infrastructure is significantly above average. The backup strategy with encrypted S3 offload and weekly restore drills exceeds what most small teams implement. CI is professional-grade. The observability stack rivals mid-size company setups. Gaps are proportionate to team size.

---

## Highlights Worth Praising

1. **Health checks are real.** `apps/api/src/modules/health/health.controller.ts:18` runs `SELECT 1` against PostgreSQL and `apps/api/src/modules/health/health.controller.ts:26` pings Redis. This is not a superficial "return 200" endpoint.
2. **Backup restore is tested.** `infra/oracle/runner/scripts/restore-check.sh` performs an actual pgBackRest restore + `pg_controldata` verification on a weekly timer. Most projects never test their backups.
3. **Network security is layered.** Database ports (5432, 6432, 9100, 9187) are firewalled at the Docker iptables level (`infra/scripts/oracle-db-network-guard.sh:40-45`) allowing only WireGuard peer IPs. SSH is hardened (`infra/scripts/oracle-host-security-hardening.sh:20-40`) with key-only auth, no root login, fail2ban.
4. **CI is production-grade.** The `ci.yml` runs 8 parallel jobs with dependency ordering, concurrency control, timeout limits, artifact uploads, and a final build gate that depends on ALL previous jobs passing.
5. **Observability covers business metrics.** Alert rules extend beyond infrastructure health to application SLIs: finance summary p95 latency, kitchen view latency, realtime socket rejections, and Redis adapter fallback detection (`infra/docker/observability/prometheus/alert.rules.yml:85-143`).
6. **Docker images are tagged by release.** `infra/scripts/oracle-builder-deploy.ps1:104` creates both `:latest` and `:YYYYMMddHHmmss` tags, enabling rollback (once a script exists).

---

## Appendix: Complete File Reference Index

| Category                  | Key Files (Absolute Paths)                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker — Production       | `infra/oracle/docker/api.Dockerfile`, `infra/oracle/docker/web.Dockerfile`, `infra/oracle/db/docker/postgres.Dockerfile`, `infra/oracle/db/docker/pgbouncer.Dockerfile`, `infra/oracle/runner/docker/utility.Dockerfile`                                                                                                                                            |
| Docker — Compose          | `infra/oracle/compose.yaml`, `infra/oracle/db/compose.yaml`, `infra/oracle/ops/compose.yaml`, `infra/oracle/runner/compose.yaml`, `infra/docker/docker-compose.yml`, `infra/docker/docker-compose.observability.yml`, `infra/docker/docker-compose.sandbox.yml`, `infra/docker/docker-compose.sandbox.offline.yml`                                                  |
| Docker — Ignore           | `.dockerignore`                                                                                                                                                                                                                                                                                                                                                     |
| CI/CD Workflows           | `.github/workflows/ci.yml`, `.github/workflows/ci-release-proposal.yml`, `.github/workflows/sonarqube.yml`                                                                                                                                                                                                                                                          |
| CI/CD Actions             | `.github/actions/setup-node-workspace/action.yml`                                                                                                                                                                                                                                                                                                                   |
| Deploy Scripts            | `infra/scripts/oracle-builder-deploy.ps1`, `infra/scripts/railway-build.sh`, `infra/scripts/railway-start.sh`, `infra/scripts/bootstrap-local.ps1`                                                                                                                                                                                                                  |
| Backup & Recovery         | `infra/oracle/db/config/pgbackrest.conf.template`, `infra/oracle/db/config/postgresql.conf`, `infra/scripts/oracle-db-bootstrap.sh`, `infra/oracle/runner/scripts/restore-check.sh`, `infra/oracle/runner/systemd/restore-check.timer`, `infra/oracle/runner/systemd/restore-check.service`                                                                         |
| Health Checks             | `apps/api/src/modules/health/health.controller.ts`, `apps/api/src/modules/health/health.module.ts`                                                                                                                                                                                                                                                                  |
| Observability Stack       | `infra/oracle/ops/compose.yaml`, `infra/oracle/ops/prometheus/prometheus.yml`, `infra/oracle/ops/prometheus/alert.rules.yml`, `infra/oracle/ops/alloy/config.alloy`, `infra/oracle/ops/loki/config.yaml`, `infra/oracle/ops/tempo/tempo.yaml`, `infra/oracle/ops/blackbox/blackbox.yml`, `infra/oracle/ops/grafana/dashboards/*.json`                               |
| Observability — Local Dev | `infra/docker/docker-compose.observability.yml`, `infra/docker/observability/prometheus/prometheus.yml`, `infra/docker/observability/prometheus/alert.rules.yml`, `infra/docker/observability/alloy/config.alloy`, `infra/docker/observability/loki/config.yaml`, `infra/docker/observability/tempo/tempo.yaml`, `infra/docker/observability/blackbox/blackbox.yml` |
| Environment Templates     | `.env.example`, `.env.container.example`, `infra/oracle/.env.example`, `infra/oracle/db/.env.example`, `infra/oracle/ops/.env.example`, `infra/oracle/runner/.env.example`                                                                                                                                                                                          |
| Security Hardening        | `infra/scripts/oracle-host-security-hardening.sh`, `infra/scripts/oracle-db-network-guard.sh`, `infra/scripts/oracle-host-input-guard.sh`                                                                                                                                                                                                                           |
| Architecture Docs         | `infra/oracle/THREE_VM_STRATEGY.md`, `infra/oracle/README.md`, `infra/oracle/db/README.md`, `infra/oracle/ops/README.md`, `infra/oracle/runner/README.md`                                                                                                                                                                                                           |
| Build Pipeline            | `turbo.json`, `package.json` (lines 11-57 scripts)                                                                                                                                                                                                                                                                                                                  |
| Nginx Config              | `infra/oracle/nginx/nginx.conf`, `infra/oracle/nginx/conf.d/deskimperial.conf`                                                                                                                                                                                                                                                                                      |
| Deployment Targets        | `railway.json`, `apps/web/railway.json`                                                                                                                                                                                                                                                                                                                             |
| Git Hooks                 | `.husky/pre-commit`                                                                                                                                                                                                                                                                                                                                                 |
| Git Ignore                | `.gitignore`                                                                                                                                                                                                                                                                                                                                                        |
| DB Init                   | `infra/oracle/db/initdb/010-init-roles.sh`, `infra/oracle/db/initdb/001-init-auth.sql`                                                                                                                                                                                                                                                                              |
| BI Refresh                | `infra/oracle/db/scripts/refresh-bi.sh`, `infra/oracle/db/sql/refresh-bi.sql`, `infra/oracle/db/systemd/bi-refresh.timer`                                                                                                                                                                                                                                           |
| WireGuard                 | `infra/oracle/network/wireguard/*.example.conf`, `infra/oracle/network/wireguard/README.md`                                                                                                                                                                                                                                                                         |
