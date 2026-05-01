# Auditoria e Plano de Reforma Visual — Frontend Desk Imperial

**Data:** 2026-04-06  
**Escopo:** dashboard web, superfícies operacionais, métricas, gráficos, áreas de perfil/empresa/funcionário e padrões visuais reutilizáveis do frontend.  
**Referências locais analisadas:** `C:/Users/Desktop/next-shadcn-admin-dashboard` e `C:/Users/Desktop/Downloads/free-react-tailwind-admin-dashboard-main`.  
**Referências visuais externas usadas como direção:** TailAdmin, Preline CMS, NextCRM e a captura enviada como referência visual.  
**Regra de uso:** inspiração estrutural e estética, sem cópia cega de blocos ou transplantar componentes sem contexto.

---

## 1. Diagnóstico comparativo

### O que o frontend atual já tem de bom

- O projeto já tem identidade própria: dark mode consistente, linguagem "imperial" e uso forte de tons dourados, verdes e azuis operacionais.
- A arquitetura do dashboard já separa áreas por domínio: visão geral, vendas, portfólio, PDV, calendário, folha, salão, mapa e configurações.
- A sidebar já tem navegação com contexto de usuário, grupos de seções e quick actions, evitando a sensação de página solta.
- O backend já alimenta métricas reais suficientes para construir uma experiência de SaaS: receita, lucro, pedidos, estoque, categorias, equipe e clientes.
- O sistema já usa Recharts, tokens CSS e componentes reutilizáveis; isso permite melhorar composição sem adicionar dependências pesadas.

### O que limita a sensação de produto premium

- A superfície `imperial-card` é usada em muitos contextos diferentes; isso cria unidade, mas também faz telas diferentes parecerem variações da mesma caixa.
- O dashboard principal ainda depende muito de grids de cards com mesmo peso visual, especialmente nas métricas iniciais.
- Algumas áreas importantes têm boa informação, mas pouca composição: os blocos aparecem corretos isoladamente, porém não conversam tanto como painel executivo.
- Há excesso de efeito visual acumulado em cards (`beam`, gradientes, borda e sombra). Em uso repetido, isso pode parecer mais "showcase" do que produto.
- As áreas de perfil/empresa/funcionário funcionam, mas ainda têm aparência de formulário e lista empilhados, não de painel administrativo maduro.

### Padrões que valem absorver do `next-shadcn-admin-dashboard`

- Grids com pesos variados (`xl:grid-cols-6`, cards de 1 e 2 colunas) para quebrar monotonia de métricas iguais.
- Cards com cabeçalho, ação, conteúdo e rodapé de leitura, em vez de número solto dentro de um bloco.
- Uso de micrográficos e progresso dentro dos próprios blocos para explicar tendência sem abrir uma seção separada.
- Painéis operacionais que respondem a perguntas de gestão: funil, regiões, itens de ação e leitura rápida.
- Sidebar como estrutura de produto, não apenas lista de links.

### Padrões que valem absorver do `free-react-tailwind-admin-dashboard-main`

- Métricas mais limpas e legíveis, com ícone, valor, label e badge de tendência sem excesso de decoração.
- Gráficos com cabeçalho simples e área visual bem protegida.
- Área de perfil em formato de cartão administrativo: identidade, contexto e ação de edição no mesmo bloco.
- Sidebar com estados claros de item ativo, submenu e agrupamento.

### Padrões que não devem ser copiados

- Não copiar a paleta azul genérica de dashboard pronto.
- Não importar componentes completos com dados fictícios ou social links sem sentido para o Desk Imperial.
- Não transformar a interface em shadcn puro sem a identidade atual do produto.
- Não substituir a estética imperial por layout branco/cinza de SaaS genérico.
- Não adicionar dependências de UI novas quando os padrões já podem ser traduzidos com Tailwind, tokens e componentes atuais.

---

## 2. Direção visual proposta

### Domínio

- comércio brasileiro
- caixa e venda em tempo real
- salão/mesa/comanda
- estoque e margem
- rotina de dono e funcionário
- leitura financeira rápida
- governança leve para pequena operação

### Mundo de cor

- fundo escuro de painel operacional
- dourado/latão como assinatura de marca e decisão executiva
- verde como venda, caixa, saúde e fluxo
- azul como leitura técnica, mapa e sistema
- vermelho dessaturado apenas para risco/queda
- bordas cinza-azuladas de baixa opacidade para estrutura

### Assinatura de produto

A assinatura visual deve ser um **painel de comando comercial**: blocos conectados, métricas com leitura operacional, superfícies com divisões internas e menos caixas soltas. O usuário deve sentir que está olhando para a operação de uma loja/bar/restaurante, não para um dashboard genérico.

### Defaults rejeitados

- **Default:** cinco cards iguais de KPI.  
  **Substituição:** grade com peso variado, card principal maior e métricas satélite.
- **Default:** card com brilho/efeito em todo lugar.  
  **Substituição:** superfície base mais calma, com acento só onde existe significado.
- **Default:** formulário de perfil como bloco isolado.  
  **Substituição:** painel de identidade da empresa com contexto, dados e ação.
- **Default:** dashboard como lista vertical de cards.  
  **Substituição:** seções com continuidade visual e agrupamentos compostos.

---

## 3. Páginas e componentes prioritários

| Prioridade | Área                                                                       | Motivo                                                                               |
| ---------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| P0         | `DashboardWorkspaceHeader`                                                 | É a primeira leitura do app; precisa parecer command center, não hero/card genérico. |
| P0         | `OverviewEnvironment` e `MetricCard`                                       | Concentram a primeira sensação de dashboard SaaS e hoje têm cards muito homogêneos.  |
| P1         | `FinanceOverviewTotal`, `FinanceChannelsPanel`, `FinanceCategoriesSidebar` | Já têm dados fortes, mas precisam parecer uma seção financeira conectada.            |
| P1         | `FinanceChart`                                                             | É bom, mas pode reduzir card-in-card e ganhar leitura executiva mais integrada.      |
| P1         | `AccountTab`, `AccountProfileCard`, `EmployeeManagementCard`               | Áreas de perfil/empresa/funcionário precisam parecer administração madura.           |
| P2         | `SalesEnvironment`, `OrderForm`, pedidos recentes                          | Fluxo comercial deve reduzir sensação de módulos empilhados.                         |
| P2         | Sidebars e estados de navegação                                            | Já estão melhores; refinamento deve ser incremental para não quebrar navegação.      |

---

## 4. Plano de reforma visual

### Fase 1 — Ganhos rápidos e seguros

| Item                                                              | Arquivos                                                                               | Risco | Impacto | Complexidade | Prioridade |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----- | ------- | ------------ | ---------- |
| Transformar o header em command center                            | `apps/web/components/dashboard/dashboard-shell.tsx`, `apps/web/app/globals.css`        | Baixo | Alto    | Média        | P0         |
| Evoluir `MetricCard` para tile de produto menos genérico          | `apps/web/components/dashboard/metric-card.tsx`, `apps/web/app/globals.css`            | Baixo | Alto    | Média        | P0         |
| Trocar grid inicial por composição de métricas com spans variados | `apps/web/components/dashboard/environments/overview-environment.tsx`                  | Baixo | Alto    | Baixa        | P0         |
| Dar ao total financeiro aparência de painel composto              | `apps/web/components/dashboard/finance-overview-total.tsx`, `apps/web/app/globals.css` | Baixo | Médio   | Baixa        | P1         |

### Fase 2 — Refatoração estrutural

| Item                                                                      | Arquivos                                                                  | Risco | Impacto | Complexidade | Prioridade |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----- | ------- | ------------ | ---------- |
| Conectar pedidos, categorias e canais como seção financeira única         | `FinanceChannelsPanel`, `FinanceCategoriesSidebar`, `OverviewEnvironment` | Médio | Alto    | Média        | P1         |
| Reestruturar perfil da empresa como painel administrativo                 | `AccountTab`, `AccountProfileCard`, `SettingsMetric`                      | Médio | Alto    | Média        | P1         |
| Reestruturar funcionário/equipe com lista mais densa e status operacional | `EmployeeManagementCard`                                                  | Médio | Médio   | Média        | P1         |
| Refinar tabelas e listas com headers, status e ações mais claros          | `FinanceOrdersTable`, `OperationRecentOrdersPanel`, listas compartilhadas | Médio | Médio   | Média        | P2         |

### Fase 3 — Refinamento premium

| Item                                                             | Arquivos                                                            | Risco | Impacto | Complexidade | Prioridade |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- | ----- | ------- | ------------ | ---------- |
| Reduzir efeitos globais repetidos em cards sem apagar identidade | `apps/web/app/globals.css`                                          | Médio | Alto    | Média        | P1         |
| Criar camada de design system operacional                        | `apps/web/components/dashboard/*`, `apps/web/docs/design-tokens.md` | Médio | Alto    | Alta         | P1         |
| Microinterações discretas em navegação, tabs e painéis           | CSS e componentes de dashboard                                      | Baixo | Médio   | Média        | P2         |
| Padronizar estados vazios, loading e erro                        | `components/shared/skeleton.tsx` e cards de domínio                 | Baixo | Médio   | Média        | P2         |

---

## 5. Primeira implementação autorizada por este plano

A primeira passada deve atacar **Fase 1** porque tem maior impacto visual com baixo risco funcional:

1. `DashboardWorkspaceHeader` vira um command center com superfície conectada.
2. `MetricCard` passa a ter estrutura interna mais forte, com acento controlado e sparkline integrado.
3. `OverviewEnvironment` passa a usar composição com spans variados, quebrando o grid homogêneo.
4. `FinanceOverviewTotal` recebe tratamento de painel financeiro composto, com divisões internas em vez de mini-cards soltos.

Essa fase não altera contratos de dados, não exige backend e não adiciona dependência.
