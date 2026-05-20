/**
 * Substitui classes arbitrárias baseadas em var(--*) por utilitários de tokens ativos do CSS global.
 * Uso: node scripts/refactor-desk-tailwind.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', 'apps', 'web')

/** @type {Array<[string, string]>} Ordem: strings mais longas primeiro. */
const REPLACEMENTS = [
  ['focus-within:border-[var(--accent)]', 'focus-within:border-accent'],
  ['focus-within:ring-[rgba(212,177,106,0.16)]', 'focus-within:ring-accent/20'],
  ['focus-within:ring-2 focus-within:ring-[rgba(212,177,106,0.16)]', 'focus-within:ring-2 focus-within:ring-accent/20'],
  ['focus:border-[var(--danger)]', 'focus:border-destructive'],
  ['focus:border-[var(--accent)]', 'focus:border-accent'],
  ['focus:ring-[rgba(245,132,132,0.18)]', 'focus:ring-destructive/20'],
  ['focus:ring-[var(--accent-soft)]', 'focus:ring-accent/20'],
  ['focus:ring-4 focus:ring-[var(--accent-soft)]', 'focus:ring-4 focus:ring-accent/20'],
  ['placeholder:text-[var(--text-soft)]', 'placeholder:text-muted-foreground'],
  ['text-[var(--text-primary)]', 'text-foreground'],
  ['text-[var(--text-muted)]', 'text-label'],
  ['text-[var(--text-soft)]', 'text-muted-foreground'],
  ['bg-[var(--surface-soft)]', 'bg-surface-soft'],
  ['bg-[var(--surface-muted)]', 'bg-muted'],
  ['bg-[var(--surface)]', 'bg-card'],
  ['bg-[var(--bg)]', 'bg-background'],
  ['border-[var(--border-strong)]', 'border-border-strong'],
  ['border-[var(--border)]', 'border-border'],
  ['border-[var(--danger)]', 'border-destructive'],
  ['border-[var(--accent)]', 'border-accent'],
  ['text-[var(--danger)]', 'text-destructive'],
  ['text-[var(--accent)]', 'text-accent'],
  ['text-[var(--success)]', 'text-success'],
  ['text-[var(--info)]', 'text-info'],
  ['bg-[var(--accent)]', 'bg-accent'],
  ['accent-[var(--accent)]', 'accent-accent'],
]

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name === '.next') continue
      walk(p, out)
    } else if (/\.(tsx|ts)$/.test(name.name)) {
      out.push(p)
    }
  }
  return out
}

let changed = 0
for (const file of walk(root)) {
  let s = fs.readFileSync(file, 'utf8')
  const orig = s
  for (const [a, b] of REPLACEMENTS) {
    s = s.split(a).join(b)
  }
  if (s !== orig) {
    fs.writeFileSync(file, s, 'utf8')
    changed += 1
    console.log('updated:', path.relative(root, file))
  }
}
console.log('files changed:', changed)
