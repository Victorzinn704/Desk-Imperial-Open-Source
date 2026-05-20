# Snapshot de Cobertura de Testes - 2026-04-03

> Nota: para o detalhamento completo da rodada que levou backend para 90% e frontend para 85%+, consulte `docs/testing/coverage-upgrade-session-2026-04-03.md`.

## Escopo

Este snapshot consolida a cobertura atual do projeto Desk Imperial com base nos relatórios gerados em:

- apps/web/coverage/index.html
- apps/api/coverage/lcov-report/index.html

Data de referencia: 2026-04-03.

---

## 1) Cobertura global do projeto (monorepo)

| Metrica    | Cobertura |
| ---------- | --------- |
| Linhas     | 78.83%    |
| Statements | 78.56%    |
| Branches   | 64.56%    |
| Functions  | 78.61%    |

---

## 2) Cobertura por aplicacao

### Frontend (apps/web)

| Metrica    | Cobertura |
| ---------- | --------- |
| Linhas     | 70.04%    |
| Statements | 69.54%    |
| Branches   | 59.07%    |
| Functions  | 69.54%    |

### Backend (apps/api)

| Metrica    | Cobertura |
| ---------- | --------- |
| Linhas     | 84.22%    |
| Statements | 84.30%    |
| Branches   | 68.93%    |
| Functions  | 87.69%    |

---

## 3) Areas de destaque - frontend

| Area                              | Linhas |
| --------------------------------- | ------ |
| components/dashboard              | 77.24% |
| components/dashboard/environments | 74.51% |
| components/pdv                    | 78.40% |
| components/operations             | 59.32% |
| components/owner-mobile           | 56.80% |
| components/staff-mobile           | 52.30% |
| components/shared                 | 51.16% |
| lib/operations                    | 89.30% |
| lib/observability                 | 76.92% |
| lib/outros                        | 92.18% |

---

## 4) Areas de destaque - backend

| Area                        | Linhas  |
| --------------------------- | ------- |
| modules/operations          | 92.99%  |
| modules/auth                | 58.64%  |
| modules/products            | 100.00% |
| modules/finance             | 99.26%  |
| modules/orders              | 92.31%  |
| modules/operations-realtime | 89.29%  |
| modules/admin-pin           | 81.41%  |
| modules/employees           | 76.00%  |
| common/services             | 77.10%  |
| common/utils                | 52.33%  |
| config                      | 93.18%  |

---

## 5) Operacao por CLI (git + gh)

Sim, o fluxo pode ser executado integralmente por CLI, incluindo commit, push e sincronizacao sem confirmacoes manuais no editor, desde que a autenticacao ja esteja valida.

No ambiente atual, o push foi realizado via git CLI sem prompts interativos.
Quando o gh estiver instalado e autenticado, ele pode ser usado para validar sessao e automatizar fluxos GitHub adicionais.

Exemplo de fluxo:

```bash
# commit local
git add <arquivos>
git commit -m "docs(testing): atualiza snapshot de cobertura"

# push no repositorio desk-imperial (remote origin)
git push origin HEAD

# push no repositorio open source (remote public)
git push public HEAD

# opcional: validar autenticacao quando gh estiver disponivel
gh auth status
```

Observacao:

- quando o contexto exigir deploy, ele tambem pode ser executado por CLI (exemplo: railway up --service imperial-desk-web).
