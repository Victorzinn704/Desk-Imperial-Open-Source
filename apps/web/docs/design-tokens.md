# Desk Imperial — tokens de estilo

## Onde fica o quê

| Arquivo | Função |
|--------|--------|
| `app/desk-theme.css` | **Fonte única** de tokens Tailwind v4 (`@theme`): cores `desk-*`, aliases `background`/`foreground`/`accent`, sombras e raios. |
| `app/globals.css` | Importa Leaflet + `desk-theme.css` + Tailwind; **ponte `:root`** (`--bg`, `--accent`…) para código legado; `@layer base` e `@layer components` (cards, sidebar, mapa). |

## Como usar

- **Novo código (preferido):** utilitários Tailwind gerados pelo `@theme`, por exemplo `bg-background`, `text-foreground`, `border-border`, `bg-accent`, `rounded-(--radius-desk-card)` (ajuste conforme sua versão do Tailwind).
- **Código existente:** continue usando `var(--bg)`, `var(--accent)`, `var(--text-primary)` — mapeados em `:root` para os tokens `desk-*`.

## Hierarquia de cor (mental model)

1. **Ink** — fundo da aplicação (`desk-ink`).
2. **Surface** — painéis (`surface-base` → `raised` → `soft`).
3. **Linha** — bordas (`line` / `line-strong`).
4. **Texto** — `fg` → `fg-muted` → `fg-soft`.
5. **Marca** — dourado só em acento e estados de destaque (`desk-accent`).

Alterar a identidade visual no futuro = principalmente **editar `desk-theme.css`**, não espalhar hex em componentes.
