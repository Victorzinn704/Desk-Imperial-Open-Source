# Matriz de Fechamento de Rotas — Web + PWA

Data de consolidação: 2026-04-21
Objetivo: deixar explícito o que é rota canônica, o que é alias, o que está congelado e o que não pode reaparecer como superfície quebrada.

## Regras

1. rota canônica é a que recebe evolução funcional
2. alias só existe para compatibilidade e deve redirecionar
3. protótipo congelado não pode receber feature nova
4. rota inexistente não pode permanecer em manifesto, navegação ou atalho

## Superfícies canônicas

| Rota                          | Papel                                 | Status              | Referência                                                                         |
| ----------------------------- | ------------------------------------- | ------------------- | ---------------------------------------------------------------------------------- |
| `/design-lab/overview`        | desktop canônico de overview          | ativa               | [overview/page.tsx](../../apps/web/app/design-lab/overview/page.tsx)               |
| `/design-lab/pdv`             | desktop canônico de PDV/comandas      | ativa               | [pdv/page.tsx](../../apps/web/app/design-lab/pdv/page.tsx)                         |
| `/design-lab/salao`           | desktop canônico de salão             | ativa               | [salao/page.tsx](../../apps/web/app/design-lab/salao/page.tsx)                     |
| `/design-lab/pedidos`         | desktop canônico de pedidos           | ativa               | [pedidos/page.tsx](../../apps/web/app/design-lab/pedidos/page.tsx)                 |
| `/design-lab/caixa`           | desktop canônico de caixa             | ativa               | [caixa/page.tsx](../../apps/web/app/design-lab/caixa/page.tsx)                     |
| `/design-lab/cozinha`         | desktop canônico de cozinha           | ativa               | [cozinha/page.tsx](../../apps/web/app/design-lab/cozinha/page.tsx)                 |
| `/design-lab/financeiro`      | desktop canônico de financeiro + mapa | ativa               | [financeiro/page.tsx](../../apps/web/app/design-lab/financeiro/page.tsx)           |
| `/design-lab/calendario`      | desktop canônico de calendário        | ativa               | [calendario/page.tsx](../../apps/web/app/design-lab/calendario/page.tsx)           |
| `/design-lab/portfolio`       | desktop canônico de portfólio         | ativa               | [portfolio/page.tsx](../../apps/web/app/design-lab/portfolio/page.tsx)             |
| `/design-lab/equipe`          | desktop canônico de equipe            | ativa               | [equipe/page.tsx](../../apps/web/app/design-lab/equipe/page.tsx)                   |
| `/design-lab/payroll`         | desktop canônico de folha             | ativa               | [payroll/page.tsx](../../apps/web/app/design-lab/payroll/page.tsx)                 |
| `/design-lab/ia`              | desktop canônico de IA                | ativa               | [ia/page.tsx](../../apps/web/app/design-lab/ia/page.tsx)                           |
| `/design-lab/config`          | desktop canônico de configurações     | ativa               | [config/page.tsx](../../apps/web/app/design-lab/config/page.tsx)                   |
| `/design-lab/cadastro-rapido` | desktop canônico de cadastro rápido   | ativa em fechamento | [cadastro-rapido/page.tsx](../../apps/web/app/design-lab/cadastro-rapido/page.tsx) |
| `/app`                        | entrada PWA por sessão/role           | ativa               | [app/page.tsx](../../apps/web/app/app/page.tsx)                                    |
| `/app/owner`                  | owner PWA                             | ativa               | [owner/page.tsx](../../apps/web/app/app/owner/page.tsx)                            |
| `/app/owner/cadastro-rapido`  | cadastro rápido canônico do owner PWA | ativa               | [cadastro-rapido/page.tsx](../../apps/web/app/app/owner/cadastro-rapido/page.tsx)  |
| `/app/staff`                  | staff PWA                             | ativa               | [staff/page.tsx](../../apps/web/app/app/staff/page.tsx)                            |

## Aliases permitidos

| Rota                       | Destino                        | Motivo                                                   |
| -------------------------- | ------------------------------ | -------------------------------------------------------- |
| `/dashboard?...`           | `/design-lab/...`              | compatibilidade com links legados e query params antigos |
| `/dashboard/configuracoes` | `/design-lab/config`           | compatibilidade                                          |
| `/ia`                      | `/design-lab/ia`               | atalho legível                                           |
| `/cozinha`                 | `/design-lab/cozinha`          | atalho legível                                           |
| `/financeiro`              | `/design-lab/financeiro?tab=*` | atalho legível                                           |
| `/design-lab`              | `/design-lab/overview`         | entrada do desktop                                       |

## Rotas congeladas

| Rota                              | Status                      | Regra                                             |
| --------------------------------- | --------------------------- | ------------------------------------------------- |
| `/dashboard-wireframe`            | protótipo congelado         | não receber evolução funcional nesta fase         |
| `/dashboard/configuracoes`        | apenas alias                | não reabrir ambiente visual próprio               |
| `/lite`, `/lite/web`, `/lite/pwa` | trilha paralela/laboratório | não misturar com a superfície canônica desta fase |

## Exposição removida

| Superfície                                  | Ação tomada                                                      | Motivo                                                |
| ------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| `share_target` do PWA em `/app/staff/share` | removido de [manifest.json](../../apps/web/public/manifest.json) | havia endpoint declarado sem rota real correspondente |

## Checklist de auditoria de rota

Antes de fechar uma frente:

1. a rota canônica abre
2. a navegação aponta para a rota canônica
3. o alias, se existir, redireciona
4. não existe manifesto, shortcut ou botão para rota ausente
5. a rota depende de sessão/role corretamente
6. o estado vazio é explícito quando o backend ainda não retornou dado útil

## Próximo uso desta matriz

Toda nova frente desta fase precisa declarar, antes de implementar:

1. qual rota canônica será alterada
2. quais aliases precisam continuar vivos
3. se existe rota congelada que não pode ser tocada
