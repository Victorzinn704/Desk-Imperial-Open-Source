# Copilot Workspace Instructions

## Browser Automation Standard

When browser automation or UI validation is requested in this workspace:

- Use Playwright CLI (`playwright-cli`) as first option.
- Use explicit session flag `-s=desk-imperial-copilot`.
- If `playwright-cli` is not available globally, use `npx playwright-cli`.

## Interface Design Standard

When implementing product UI in this workspace (dashboard, app modules, internal tools):

- Follow `interface-design` principles from `Dammyjay93/interface-design`.
- Use the Intent checkpoint before coding UI: Intent, Palette, Depth, Surfaces, Typography, Spacing.
- Keep consistency with a reusable system in `.interface-design/system.md` when available.
- Do not apply this flow to marketing pages unless explicitly requested.

## Napkin Learning Standard

For recurring mistakes and operational learnings:

- Maintain concise notes in `.claude/napkin.md` (repo scratchpad).
- Record: failed approach, correction, final stable approach.
- Reuse those notes before repeating similar tasks.

## Session Usage

```powershell
playwright-cli -s=desk-imperial-copilot open https://example.com --persistent
playwright-cli -s=desk-imperial-copilot snapshot --depth=4
playwright-cli -s=desk-imperial-copilot close
```

## Operational Notes

- Prefer headless execution for routine checks.
- Use `--headed` only when visual inspection is required.
- Prefer snapshots as artifact over repeated screenshots.
- Isolate sessions per task and close them when done.
