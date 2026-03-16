# Contributing

## Fluxo sugerido

1. atualize sua branch a partir de `main`
2. rode `npm ci`
3. gere o Prisma client com `npm --workspace @partner/api run prisma:generate`
4. valide com:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

## Quando houver mudanca de banco

- atualize `apps/api/prisma/schema.prisma`
- gere a migration correspondente
- revise o seed se a entidade fizer parte do fluxo demo

## Quando houver mudanca de UX/UI

- preserve a identidade visual dark premium do painel
- mantenha componentes reutilizaveis
- evite telas com logica e estilo tudo no mesmo arquivo quando houver reutilizacao clara
