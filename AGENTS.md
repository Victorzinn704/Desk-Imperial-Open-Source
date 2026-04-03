# AGENTS Workspace Instructions

## Playwright CLI for Codex and Multi-Agent Workflows

- Use Playwright CLI for browser automation tasks in this repository.
- Prefer `playwright-cli` when available globally.
- If global command is unavailable, use `npx playwright-cli`.
- Keep sessions isolated per agent to avoid cross-talk in browser state.

## Session Convention

- `desk-imperial-copilot`
- `desk-imperial-codex`
- `desk-imperial-claude`

Use explicit `-s=<session>` in each command for reliable behavior.

## Interface Design Skill

- Use `interface-design` for product UI work in this repository (dashboards, app flows, tools, admin screens).
- Do not use it for marketing pages/landing campaigns.
- Installed paths:
  - Claude: `~/.claude/skills/interface-design`
  - Codex: `~/.codex/skills/interface-design`
- Apply the core checkpoint before UI edits: Intent, Palette, Depth, Surfaces, Typography, Spacing.

## Napkin Skill (Continuous Learning)

- Use `napkin` to accumulate mistakes, corrections, and successful patterns during execution.
- Installed paths:
  - Claude: `~/.claude/skills/napkin`
  - Codex: `~/.codex/skills/napkin`
- Repository scratchpad file: `.claude/napkin.md`.
- Keep entries concise and actionable so future sessions avoid repeated mistakes.

## Safety and Reproducibility

- Prefer headless runs unless visual debugging is needed.
- Prefer `snapshot` over screenshot-heavy flows.
- Close or kill stale sessions after finishing (`playwright-cli close-all` or `playwright-cli kill-all` when needed).
- Log commands used for diagnostics and test evidence.

## Quick Start

```powershell
# Codex example
playwright-cli -s=desk-imperial-codex open https://demo.playwright.dev/todomvc/ --persistent
playwright-cli -s=desk-imperial-codex snapshot --depth=4
playwright-cli -s=desk-imperial-codex close
```
