# Desk Imperial — tokens de estilo

## Onde fica o quê

| Arquivo | Função |
|--------|--------|
| `app/globals.css` | **Fonte ativa** dos imports globais e da ponte `:root` (`--bg`, `--accent`, `--text-*`) usada pelo código legado; também carrega Leaflet e Tailwind. |
| snapshot externo `Desk-Imperial-Antigo/dead-code-snapshot-2026-04-30` | Guarda artefatos arquivados fora do monorepo quando um token source ou CSS legado sai de linha. |

## Como usar

- **Novo código (preferido):** utilitários Tailwind e tokens expostos pelo CSS global ativo, por exemplo `bg-background`, `text-foreground`, `border-border`, `bg-accent`.
- **Código existente:** continue usando `var(--bg)`, `var(--accent)`, `var(--text-primary)` — mapeados em `:root` para os tokens `desk-*`.

## Hierarquia de cor (mental model)

1. **Ink** — fundo da aplicação (`desk-ink`).
2. **Surface** — painéis (`surface-base` → `raised` → `soft`).
3. **Linha** — bordas (`line` / `line-strong`).
4. **Texto** — `fg` → `fg-muted` → `fg-soft`.
5. **Marca** — dourado só em acento e estados de destaque (`desk-accent`).

Alterar a identidade visual no futuro = editar a fonte ativa de tokens globais antes de espalhar hex em componentes.
