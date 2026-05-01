# Docs & Developer Experience Audit — Desk Imperial

**Audit date:** 2026-04-26
**Scope:** README, onboarding, ADRs, runbooks, scripts, conventions, contributor experience
**Reviewer:** Agent 13 (Docs/DX Specialist)

---

## Summary

Strong documentation culture for a solo-maintainer project. 131 .md files in docs/, canonical root-level files (README, CONTRIBUTING, SECURITY, ROADMAP, CHANGELOG) all present and accurate. Local-dev quickstart works end-to-end via npm run local:backend:prepare. Coding standards are comprehensive (360-line coding-standards.md). The main gaps are: (1) script discoverability — only 1/21 scripts has --help, (2) CLAUDE.md is exclusively AI-agent instructions rather than human onboarding hints, (3) docs/GETTING-STARTED.md reads as a personal essay not a practical guide, (4) ROADMAP is stale (~25 days), and (5) no deployment guide or release-creation walkthrough exists in the docs tree.

---

## Quantitative Evidence

| Metric | Value |
|---|---|
| Total .md files in docs/ | 131 |
| Root-level governance docs | README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, ROADMAP, LICENSE (7/7 present) |
| Per-app READMEs | apps/api/README.md, apps/web/README.md (2/2 present) |
| Package READMEs | packages/types/README.md, packages/api-contract/README.md (2/2 present) |
| Scripts in scripts/ | 21 (.mjs, .ps1, .cmd) |
| Scripts in infra/scripts/ | 18 (.ps1, .sh, .cmd, .py) |
| Scripts in apps/*/scripts/ | api: 4, web: 1 |
| Scripts in infra/oracle/**/scripts/ | 6 (.sh) |
| Total scripts across project | ~50 |
| Scripts with --help / usage | 4 (check-sonar-regression.mjs, oracle-runner-bootstrap.sh, oracle-db-bootstrap.sh, oracle-bootstrap.sh) |
| Issue templates | bug_report, feature_request, question (3) |
| PR template | .github/pull_request_template.md (1) |
| Architecture docs (docs/architecture/) | 15 .md files |
| Product docs (docs/product/) | 6 .md files |
| Security docs (docs/security/) | 7 .md files |
| Testing docs (docs/testing/) | 8 .md files |
| Operations docs (docs/operations/) | 4 .md files |
| Release docs (docs/release/) | 20+ .md files + 3 .json files |
| AI agent definitions (docs/agents/) | 32 .md files |
| Case studies / lightweight ADRs | 2 (docs/case-studies/) |
| Pre-commit hook | .husky/pre-commit (1 line: npm run lint-staged) |
| Code convention files | .editorconfig, .prettierrc, .prettierignore, eslint.config.mjs (4/4 present) |
| .env.example | 127 lines, fully documented |
| Troubleshooting scenarios | 19 in docs/troubleshooting.md |

---

## Findings

### DOC-001: Scripts lack self-documentation (--help)

**Severity:** Medium
**Confidence:** High
**Evidence:** Grep for --help|usage|Usage across scripts/ returned 1 match (check-sonar-regression.mjs). The other 20 scripts in scripts/ have no built-in help text. Same pattern in infra/scripts/ where only 3 of 18 scripts have usage functions. A new developer running node scripts/quality-preflight.mjs --help gets no guidance. Scripts are invoked via npm run-scripts in package.json, but direct invocation provides no discoverability.
**Impact:** New contributors cannot discover script capabilities without reading source code or package.json scripts block. Operational users (DevOps, SRE) cannot quickly determine script parameters.
**Recommendation:** Add a 5-line usage header comment and a --help handler (or at minimum a showUsage() function) to every top-level script. Template: // Usage: node scripts/name.mjs [--flag] Description of what this does and its side effects. List the script in docs/troubleshooting.md or a new docs/scripts-reference.md.
**Effort:** Small (2-3 hours for all 21 scripts)

### DOC-002: CLAUDE.md is AI-only, not human onboarding

**Severity:** Low
**Confidence:** High
**Evidence:** CLAUDE.md (94 lines) is exclusively a Dual-Graph Context Policy specification for AI assistants -- graph_continue rules, session state JSON, token-counter MCP usage, context-store.json. It contains zero project-specific context for human developers (no architecture summary, no key modules, no common commands, no gotchas). A human reading it gets zero onboarding value.
**Impact:** Lost opportunity for an effective onboarding file. Many projects use CLAUDE.md as both AI and human context (project overview, folder map, key decisions). Here it is single-purpose.
**Recommendation:** Split into two sections: (1) keep the dual-graph policy for AI agents at the top, (2) add a Human Context section below with project overview, key files, common commands, known gotchas, and link to docs/INDEX.md. OR create a separate CONTEXT.md (as the dual-graph policy itself suggests on line 89) and keep CLAUDE.md AI-only.
**Effort:** Small (30 minutes to draft human context section)

### DOC-003: docs/GETTING-STARTED.md is a personal essay, not an onboarding guide

**Severity:** Medium
**Confidence:** High
**Evidence:** docs/GETTING-STARTED.md (48 lines) is titled Dicas para novos desenvolvedores (Tips for new developers) and contains a first-person narrative about tools the creator used (Brevo, PostgreSQL, Railway, Cloudflare) and personal philosophy. The README links to it as onboarding advice, but no reviewer will find a practical technical setup here. Contrast with docs/architecture/local-development.md which is the real onboarding document.
**Impact:** New developers expect a step-by-step technical onboarding guide. Instead they get a motivational essay. They may skip the real technical guide (docs/architecture/local-development.md) because the GETTING-STARTED link name is more intuitive.
**Recommendation:** Either (a) rename GETTING-STARTED.md to CREATOR-NOTES.md and repoint README links to docs/architecture/local-development.md, or (b) rewrite GETTING-STARTED.md as a 2-page practical guide: prerequisites, clone, env setup, db up, seed, run, smoke test, common first errors. Keep the personal notes as an appendix or separate file.
**Effort:** Small (1 hour to rewrite or restructure links)

### DOC-004: ROADMAP.md is stale (25 days without update)

**Severity:** Low
**Confidence:** High
**Evidence:** ROADMAP.md line 3: Last updated 2026-04-01. The CHANGELOG lists significant work in Unreleased (stock management, auth refactoring, ESLint Phase 1) that is not reflected in the ROADMAP status. The roadmap shows Stock management and PWA stabilization as not tracked. Git log shows commits through 2026-04-26 including feat(runtime): stabilize pwa flows, feat(pwa): stabilize mobile actions, etc.
**Impact:** External stakeholders (contributors, evaluators) see an out-of-date roadmap and may conclude the project is inactive or poorly maintained. Items completed are still shown as incomplete.
**Recommendation:** Update ROADMAP.md on the same cadence as CHANGELOG.md entries. Add a updated date to the top of the file. Mark recently completed items (PWA stabilization, stock management, ESLint phase 1, auth module split) as [x] under Em andamento or create a new Recently Completed section. Consider linking ROADMAP completion dates to CHANGELOG entries for traceability.
**Effort:** Small (30 minutes to update statuses and add date)

### DOC-005: No deployment guide or release-creation walkthrough

**Severity:** Medium
**Confidence:** High
**Evidence:** A search for deployment documentation finds: docs/security/deploy-checklist.md (security checklist only), docs/operations/staging-incident-rollback-runbook.md (operations runbook), and infra/scripts/railway-build.sh / infra/scripts/railway-start.sh (automation scripts). There is NO step-by-step guide for: how to create a release, how to deploy to production, how the CI/CD pipeline triggers deploys, how to roll back, or the difference between staging and production environments.
**Impact:** A new operations engineer or contributor wanting to deploy their own instance must reverse-engineer from scripts and env vars. Bus factor of 1 for deployment knowledge.
**Recommendation:** Create docs/operations/deployment-guide.md covering: architecture of deployment environments (Railway, Oracle Cloud, Neon), step-by-step deployment process, environment variable differences per environment, common deployment failures and fixes (link to troubleshooting section 19), how to verify a successful deployment, rollback procedure (reference staging-incident-rollback-runbook.md). Minimum viable: a 1-page doc with 5 numbered steps and a troubleshooting link.
**Effort:** Medium (2-3 hours to document the current deployment flow)

### DOC-006: Infra/docker directory has no README

**Severity:** Low
**Confidence:** High
**Evidence:** infra/docker/ contains docker-compose.yml, docker-compose.observability.yml, docker-compose.sandbox.yml, docker-compose.sandbox.offline.yml, and Dockerfile.sandbox, plus observability/ subdirectory with Grafana, Prometheus, Loki, Tempo, Alloy, Alertmanager configs. No README.md explains what each compose file does, how to start/stop services, or dependencies between them.
**Impact:** Contributors discover compose files by reading them or by tracing npm scripts (npm run db:up, npm run obs:up). Without a README, developers may not realize observability stack is available locally or how to access Grafana dashboards.
**Recommendation:** Add infra/docker/README.md with: (1) table of compose files and their purposes, (2) startup commands, (3) default ports and credentials, (4) links to relevant docs (observability-oss-phase1.md, troubleshooting sections 17-18).
**Effort:** Small (30 minutes)

### DOC-007: ADRs are informal case studies, not structured decisions

**Severity:** Low
**Confidence:** Medium
**Evidence:** docs/case-studies/ contains 2 files: 2026-02-arch-decisions-backlog.md (95 lines, covers 5 decisions extracted retroactively from commit history) and 2026-03-redis-rate-limit-migration.md. These are valuable but lack the standard ADR format (Title, Status, Context, Decision, Consequences). They read as case-study narratives rather than structured decision records. No ADR template exists.
**Impact:** New architects or contributors cannot quickly understand the project decision history. The retroactive extraction from commits is honest but indicates decisions were not documented at the time they were made.
**Recommendation:** Adopt the lightweight ADR format (Michael Nygard style) with a template in docs/architecture/adr-template.md. Migrate the 2 existing case studies to ADR format. Require new ADRs for future architectural decisions (module splits, infrastructure changes, security posture changes). List ADRs in docs/INDEX.md.
**Effort:** Small (1 hour to create template and migrate existing content)
