# Engineering Notes

## Typecheck falha com Prisma client desatualizado - nao e breaking

**Data:** 2026-04-18  
**Contexto:** investigacao de dependency upgrades (Passo 2, lotes A e C)

### Sintoma observado

- `npm run typecheck` falha em branch de upgrade.
- `npm run build` passa.
- `npm run typecheck` apos o build passa.

### Causa raiz

O schema Prisma em disco pode divergir do client Prisma gerado localmente. Quando isso acontece, o TypeScript falha ao resolver tipos/simbolos do `@prisma/client` ate que o client seja regenerado.

### Diagnostico correto

Antes de classificar falha de typecheck como breaking real de upgrade:

1. Rodar `npx prisma generate`.
2. Rodar `npm run typecheck` sem build.
3. So classificar como breaking se continuar falhando apos o generate.

### Evidencia desta investigacao

- **Lote A (`investigation/nest-runtime-upgrade`)**: assinatura observada de falso positivo (typecheck falha sem generate, build passa, typecheck apos gerar passa).
- **Lote C (`investigation/nodemailer-patch`)**: mesma assinatura observada no Passo 2.

### Regra para upgrades futuros

Em upgrades de dependencia futuros, esta assinatura deve ser tratada como **falso positivo por padrao**, ate prova tecnica em contrario apos `prisma generate`.

### Checklist rapido para triagem

- [ ] Rodei `npx prisma generate` na branch investigada.
- [ ] Rodei `npm run typecheck` sem depender de `npm run build`.
- [ ] So escalei como breaking quando a falha persistiu apos generate.