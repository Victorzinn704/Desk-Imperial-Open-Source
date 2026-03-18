# DESK IMPERIAL — Documentação Completa do Produto
**Versão:** 3.0 · **Atualizado:** 2026-03-18 · **Status:** Em Produção (Railway)

---

## Índice

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Arquitetura Técnica](#2-arquitetura-técnica)
3. [Funcionalidades Implementadas](#3-funcionalidades-implementadas)
4. [Problemas Conhecidos](#4-problemas-conhecidos)
5. [Backlog de Melhorias — UX](#5-backlog-de-melhorias--ux)
6. [Roadmap Sprint 4+](#6-roadmap-sprint-4)
7. [Componentes Bloqueados (Referência Visual)](#7-componentes-bloqueados-referência-visual)
8. [Stack Técnica Completa](#8-stack-técnica-completa)
9. [Fluxo de Deploy](#9-fluxo-de-deploy)
10. [Decisões de Produto e Filosofia](#10-decisões-de-produto-e-filosofia)

---

## 1. Visão Geral do Produto

**DESK IMPERIAL** é um SaaS de gestão comercial completo para pequenos e médios estabelecimentos. Centraliza finanças, vendas, equipe, estoque, PDV e inteligência de mercado em uma única plataforma com identidade visual forte e dark theme.

### Público-alvo
Donos e gestores de estabelecimentos físicos: restaurantes, bares, varejo, serviços. Perfil: não-técnico, toma decisões rápidas, precisa de clareza imediata nos números.

### Proposta de valor
> Você abre, vende, confere e fecha o dia — tudo aqui dentro.

---

## 2. Arquitetura Técnica

### Monorepo (Turborepo)
```
test1/
├── apps/
│   ├── web/         # Next.js 14 (App Router) — Frontend SaaS
│   └── api/         # NestJS — Backend REST API
├── packages/
│   └── contracts/   # Tipos e schemas compartilhados (TypeScript)
```

### Frontend (`apps/web`)
- **Framework:** Next.js 14 (App Router)
- **UI:** Tailwind CSS + design system próprio (`imperial-card`, `imperial-card-soft`, etc.)
- **State/Data:** TanStack Query (React Query) para cache e sincronização
- **Animações:** Framer Motion
- **Drag-and-drop:** `@hello-pangea/dnd`
- **Calendário:** `react-big-calendar` + `withDragAndDrop`
- **Gráficos:** Recharts (LineChart, PieChart, AreaChart, Sparklines)
- **Mapa:** Leaflet (Canvas) — com problema de abertura (ver seção 4)
- **Localização:** `date-fns` com locale `ptBR`
- **Persistência local:** localStorage para PIN, Payroll config, Rate Limiter
- **Auth:** Sessão via cookie (gerenciada pelo backend)

### Backend (`apps/api`)
- **Framework:** NestJS
- **ORM:** Prisma
- **Banco:** PostgreSQL (Railway)
- **Auth:** Sessões + CSRF Guard + Rate Limiting por IP
- **E-mail:** Serviço de mailer com templates (verificação, recuperação de senha)
- **Geocoding:** Módulo de geolocalização para mapa de vendas
- **Moeda:** Módulo de conversão de câmbio

### Infraestrutura
- **Hosting:** Railway
  - Web service ID: `96df3669-4696-4bf1-865f-a2e886f5dc04`
  - API service ID: `eba5ffe2-5a5c-48a0-87a8-290dce899270`
- **Deploy:** `railway up --service <id>` a partir da raiz do monorepo

---

## 3. Funcionalidades Implementadas

### 3.1 Autenticação e Conta

| Funcionalidade | Status | Localização |
|---|---|---|
| Cadastro com email/senha | ✅ | `app/cadastro/page.tsx` |
| Login com sessão persistente | ✅ | `app/login/page.tsx` |
| Verificação de email | ✅ | `app/verificar-email/page.tsx` |
| Recuperação de senha | ✅ | `app/recuperar-senha/page.tsx` |
| Redefinição de senha | ✅ | `app/redefinir-senha/page.tsx` |
| Perfil do usuário (nome, email, foto) | ✅ | `components/dashboard/account-profile-card.tsx` |
| Logout | ✅ | `dashboard-shell.tsx` |
| Rate limiting de auth (brute force) | ✅ | `api/src/modules/auth/auth-rate-limit.service.ts` |
| CSRF protection | ✅ | `api/src/modules/auth/guards/csrf.guard.ts` |
| Consentimento de cookies (LGPD) | ✅ | `components/shared/cookie-consent-banner.tsx` |

---

### 3.2 Dashboard Overview

Seção principal com KPIs financeiros e widgets analíticos.

| Widget/Componente | O que mostra | Arquivo |
|---|---|---|
| **MetricCards** (4 cards) | Receita, Lucro, Pedidos, Ticket Médio — com sparklines de tendência | `metric-card.tsx` |
| **FinanceOverviewTotal** | Receita total + breakdown período (BLOQUEADO — referência visual) | `finance-overview-total.tsx` |
| **FinanceCategoriesSidebar** | Categorias mais vendidas com barras de participação (BLOQUEADO) | `finance-categories-sidebar.tsx` |
| **FinanceChart** | Gráfico de área receita x lucro ao longo do tempo | `finance-chart.tsx` |
| **FinanceDoughnutChart** | Distribuição por canal de vendas | `finance-doughnut-chart.tsx` |
| **FinanceChannelsPanel** | Canais de venda com métricas por canal | `finance-channels-panel.tsx` |
| **PillarsExecutiveCard** | Indicadores estratégicos (4 pilares) | `pillars-executive-card.tsx` |
| **SalesPerformanceCard** | Performance de vendas vs meta | `sales-performance-card.tsx` |
| **MarketIntelligenceCard** | Insights de mercado e tendências | `market-intelligence-card.tsx` |
| **ActivityTimeline** | Linha do tempo de atividades recentes | `activity-timeline.tsx` |
| **SalesMapCard** | Mapa geográfico de vendas por região | `sales-map-card.tsx` + `sales-map-canvas.tsx` |

**Sparklines nos MetricCards:**
- Dados de `finance.revenueTimeline` (últimos 7 dias)
- Cor verde `#36f57c` se tendência positiva, vermelho `#ef4444` se negativa
- Renderizados com Recharts `<LineChart>` sem eixos

---

### 3.3 PDV / Comandas (Kanban)

Board Kanban para gestão de pedidos em tempo real.

**Colunas:**
| Coluna | Cor | Comportamento |
|---|---|---|
| Aberta | Azul | Recebe novas comandas |
| Em Preparo | Amarelo | Drop habilitado |
| Pronta | Verde | Drop habilitado |
| Fechada | Cinza | Drop desabilitado |

**Funcionalidades do card:**
- Mesa ou ID da comanda
- Nome do cliente
- Quantidade de itens
- Elapsed time (laranja se >30min)
- Badges de desconto/acréscimo
- Drag desabilitado quando status = `fechada`

**Modal de comanda:**
- Busca de produtos no portfólio
- Campo mesa + clienteNome
- CPF/CNPJ do cliente com máscara automática e validação por dígito verificador
- Desconto % e Acréscimo %
- Botões de mudança de status (quando editando)

**KPI bar do board:**
- Comandas abertas
- Total em aberto (R$)
- Fechado hoje (R$)

**Arquivos:**
- `components/pdv/pdv-board.tsx`
- `components/pdv/pdv-column.tsx`
- `components/pdv/pdv-comanda-card.tsx`
- `components/pdv/pdv-comanda-modal.tsx`
- `components/pdv/pdv-types.ts`

---

### 3.4 Calendário Comercial

Calendário interativo de atividades que impactam as vendas.

**Tipos de atividade:**
| Tipo | Cor | Uso |
|---|---|---|
| Evento | Vermelho | Shows, festas, eventos especiais |
| Jogo | Amarelo | Transmissões esportivas |
| Promoção | Verde | Happy hour, descontos especiais |
| Reunião | Azul | Reuniões internas |
| Outro | Roxo | Uso livre |

**Funcionalidades:**
- View mês (padrão), com drag-and-drop para mover eventos de data
- Resize de evento para alterar duração
- Click no dia → modal de criação
- Click no evento → modal de edição com botão Excluir
- `UpcomingEvents` widget: próximos 4 eventos
- Stats sidebar: contagem e impacto % por tipo de atividade
- Dark theme completo com override de CSS do react-big-calendar

**Arquivo:** `components/calendar/commercial-calendar.tsx`

---

### 3.5 Equipe e Folha de Pagamento

Gestão de funcionários com cálculo automático de folha.

**EmployeeManagementCard:**
- Grid com todos os funcionários
- Cadastro, edição, arquivamento e restauração
- Campos: nome, cargo, email, telefone, data contratação

**EmployeeRankingCard:**
- Ranking de vendas por funcionário (barras horizontais)
- Dados reais da API (`finance.topEmployees`)

**EmployeePayrollCard:**
- Configuração de salário base (por funcionário) e % de comissão
- Persiste em `localStorage` (chave: `desk_imperial_payroll`)
- Cálculo: `totalAPagar = salarioBase + (vendasDoMes * percentualVendas / 100)`
- Accordion: expandir/colapsar detalhes por funcionário
- KPI bar: folha total, nº de colaboradores, top comissionado

**Arquivo:** `components/dashboard/employee-payroll-card.tsx`

---

### 3.6 Portfólio de Produtos

**Funcionalidades:**
- Listagem com ProductCard (imagem, nome, categoria, preço, estoque)
- Formulário de criação/edição (ProductForm)
- Arquivamento e restauração
- Busca por nome/categoria

**Importação por CSV (ProductImportCard):**
- Colunas suportadas: `name`, `brand`, `category`, `currency`, `unitCost`, `unitPrice`, `description`, `packagingClass`, `measurementUnit`, `measurementValue`, `unitsPerPackage`, `stockPackages`, `stockLooseUnits`, `stock`
- Validação client-side: só `.csv`, máx 256KB
- Resultados da importação: linhas lidas, criados, atualizados, falhas
- Download de modelo CSV em branco
- Exportar portfólio atual como CSV

---

### 3.7 Pedidos

**FinanceOrdersTable:**
- Listagem paginada de pedidos
- Filtros por status
- Export CSV com BOM UTF-8 (compatível com Excel BR)
- Botão "Exportar CSV (N)" mostra contagem atual

**OrderCard:** Card individual de pedido com status, itens, valor
**OrderForm:** Modal de criação de pedido manual

---

### 3.8 Admin PIN (Segurança)

Proteção de ações sensíveis com PIN de 4 dígitos.

**Configuração (página de Configurações):**
- 4 inputs individuais com auto-focus em cadeia
- Salvar PIN → persiste em `localStorage` (chave: `desk_imperial_admin_pin`)
- Remover PIN → exige digitação do PIN atual como confirmação
  - Inputs vermelhos no modo de remoção
  - Validação automática no 4º dígito
  - PIN errado: limpa os campos e exibe erro
  - PIN correto: remove e desativa

**AdminPinDialog:**
- Modal estilo bancário com 4 inputs separados
- Progress bar preenchimento (dígitos digitados / 4)
- Hook `useAdminPin`: `requirePin(onConfirm)` — se PIN não configurado, passa direto

**Rate Limiting (anti brute-force):**
- Arquivo: `apps/web/lib/pin-rate-limiter.ts`
- Máx 3 tentativas → bloqueia por 5 minutos
- 30 minutos sem falha → reset automático dos contadores
- Funções: `getPinRateStatus()`, `recordPinFailure()`, `recordPinSuccess()`, `resetPinAttempts()`
- **Status:** Criado mas ainda não integrado nos componentes (pendente)

---

### 3.9 Validação de CPF/CNPJ

- Arquivo: `apps/web/lib/document-validation.ts`
- `detectDocumentType(raw)` → `'cpf' | 'cnpj' | 'unknown'`
- `maskDocument(raw)` → máscara em tempo real
- `validateCpf(raw)` + `validateCnpj(raw)` → algoritmo de dígitos verificadores (puro JS)
- `validateDocument(raw)` → `{ valid, type, message? }`
- Integrado no modal de comanda do PDV

---

### 3.10 Landing Page

**Arquivo:** `components/marketing/landing-page.tsx`

Seções:
- Hero com cards flutuantes animados (Framer Motion)
- Métricas de proposta de valor (3 pills)
- Cards de capacidades (6 cards com ícones)
- Pilares do produto (2 colunas)
- CTA final para cadastro

**Observação:** Os textos da landing page são genéricos e **não refletem as funcionalidades novas** (PDV, Calendário, Folha de Pagamento). Precisa de atualização.

---

### 3.11 Configurações

**Página:** `app/dashboard/configuracoes/page.tsx`

Seções:
1. **Perfil** — nome, email, atualização de dados
2. **Segurança** — Admin PIN (configurar / remover)
3. Links para seções do dashboard

---

## 4. Problemas Conhecidos

### P1 — Mapa de Vendas não abre
**Sintoma:** O componente `SalesMapCanvas` (Leaflet) não renderiza corretamente.
**Causa provável:** Carregamento dinâmico do Leaflet com SSR=false tem conflito em alguma versão ou o CSS do Leaflet não está sendo injetado corretamente.
**Resolução planejada:** Substituir Leaflet por mapa com API pública alternativa (a definir pelo usuário — será pesquisado).

---

### P2 — Logos antigas apagadas/sem cores
**Sintoma:** Logos que existiam no sistema estão exibindo sem cor (provavelmente `fill="currentColor"` com cor errada ou SVG sem fill explícito).
**Resolução planejada:** Reconfigurar as logos antigas para seguir o padrão visual das logos novas.

---

### P3 — Rate limiter do PIN não integrado
**Sintoma:** `pin-rate-limiter.ts` foi criado mas `admin-pin-dialog.tsx` e `configuracoes/page.tsx` ainda usam controle de tentativas local (estado React simples, não persistido).
**Resolução planejada:** Integrar as funções do rate limiter nos dois pontos de entrada do PIN.

---

### P4 — packagingClass padrão visível como "Cadastro rápido"
**Sintoma:** Produtos importados por CSV sem `packagingClass` têm esse campo preenchido com `'Cadastro rápido'`, que aparece na interface do portfólio.
**Resolução planejada:** Trocar o fallback para `'UN'` no parser de importação e/ou filtrar a exibição quando o valor for o padrão.

---

## 5. Backlog de Melhorias — UX

Melhorias identificadas em conversa de produto (2026-03-18):

### 5.1 Barra de pesquisa global (Alta prioridade)
**Descrição:** Barra de pesquisa fixa/sticky que aparece em **todas as seções** do dashboard, não apenas no portfólio.
**Comportamento:** Pesquisa produtos, pedidos, funcionários, comandas — tudo de uma vez.
**Posição sugerida:** Header do dashboard, ao lado da navegação.

---

### 5.2 Navegação (sidebar) — redesign (Alta prioridade)
**Problema atual:** Sidebar larga demais.
**Solução:** Sidebar um pouco menos larga e mais comprida, encostada no canto esquerdo. Possivelmente com labels visíveis em vez de só ícones. Se possivel, usarmos a preferencia de algumas paginas, que vc aperta no canto e o sidebar se recolhe e fica so os icones
**Referência:** Sidebars estilo Notion/Linear — ícone + label, seção agrupada por contexto, tendo um interface melhor e mais completa.

---

### 5.3 Importação CSV — "Saiba mais" colapsável (Média prioridade)
**Problema atual:** Tabela de colunas esperadas fica toda exposta, poluindo visualmente.
**Solução:** Colapsar a tabela de colunas atrás de um botão/link "Saiba mais ▼". Ao clicar, expande com animação. Por padrão, fechado.

---

### 5.4 Landing Page atualizada (Alta prioridade)
**Problema atual:** A landing page não menciona PDV, Calendário Comercial, Folha de Pagamento, Admin PIN, Export CSV — funcionalidades que foram desenvolvidas e são diferenciais reais.
**Solução:** Reescrever os textos e as seções de capacidades para refletir o produto atual. Adicionar screenshots ou mockups das telas.

---

### 5.5 Login e Cadastro com conteúdo do SaaS (Média prioridade)
**Problema atual:** Telas de login e cadastro são genéricas, sem referência ao que o usuário vai acessar.
**Solução:** Adicionar sidebar informativa (split layout) mostrando um benefício ou feature do produto ao lado do formulário.

---

### 5.6 Verificação de email — fluxo correto (Média prioridade)
**Problema atual:** A mensagem de verificação de email aparece na mesma tela do cadastro, interrompendo o fluxo.
**Solução:** No primeiro acesso após cadastro, redirecionar para uma tela intermediária com mensagem clara: _"Enviamos um link para {email}. Verifique sua caixa de entrada."_ — separada do formulário de cadastro.

---

### 5.7 Loading states — skeletons/spinners (Média prioridade)
**Problema atual:** Algumas páginas ficam em branco enquanto os dados carregam.
**Solução:** Implementar `<Skeleton>` (já existe em `components/shared/skeleton.tsx`) em todas as seções durante o carregamento. O componente já existe — falta aplicar.

---

### 5.8 Logo do site e favicon (Baixa prioridade)
**Descrição:** Configurar uma logo definitiva para o DESK IMPERIAL tanto na web quanto como favicon (`/app/favicon.ico`).
**Sugestão:** A BrandMark já existe em `components/shared/brand-mark.tsx` — usar como base para o favicon SVG/ICO.

---

### 5.9 Onboarding para novos usuários (Futura)
**Problema:** Usuário novo abre o sistema e não sabe o que fazer — portfólio vazio, sem contexto.
**Solução:** Checklist de setup no dashboard:
- ✅ Conta criada
- ⬜ Primeiro produto cadastrado / CSV importado
- ⬜ Primeiro pedido registrado
- ⬜ Admin PIN configurado

---

### 5.10 Estado vazio com call-to-action (Futura)
**Problema:** Telas sem dados (PDV sem comandas, portfólio vazio) mostram tela em branco ou lista vazia sem guia.
**Solução:** Em cada seção com estado vazio, mostrar ilustração + mensagem + botão de ação principal.

---

## 6. Roadmap Sprint 4+

### Sprint 4 — Correções e Polimento (prioridade imediata)

| Item | Tipo | Complexidade |
|---|---|---|
| Integrar `pin-rate-limiter` no `admin-pin-dialog.tsx` e configurações | Fix | Baixa |
| `packagingClass` → fallback `'UN'` no parser + esconder na UI | Fix | Baixa |
| Importação CSV — "Saiba mais" colapsável | UX | Baixa |
| Logos antigas — reconfigurar cores para o novo padrão visual | Fix | Média |
| Sidebar — redesign (mais larga, labels visíveis) | UX | Média |
| Mapa de vendas — substituir Leaflet por API pública | Fix | Alta |
| Loading skeletons em todas as seções | UX | Média |

---

### Sprint 5 — Auth e Primeiro Acesso

| Item | Tipo | Complexidade |
|---|---|---|
| Verificação de email — tela intermediária separada do cadastro | UX/Product | Média |
| Login/Cadastro — layout split com apresentação do produto | UX | Média |
| Landing page — reescrever com features reais | Marketing | Alta |
| Favicon e logo definitiva | Branding | Baixa |

---

### Sprint 6 — Busca Global e Navegação

| Item | Tipo | Complexidade |
|---|---|---|
| Barra de pesquisa global (todos os dados) | Feature | Alta |
| Pesquisa com resultados por categoria (produtos, pedidos, etc.) | Feature | Alta |
| Sidebar redesign completo com labels | UX | Média |
| Atalhos de teclado (Cmd+K para pesquisa) | UX | Média |

---

### Sprint 7 — Onboarding e Estado Vazio

| Item | Tipo | Complexidade |
|---|---|---|
| Checklist de setup na primeira entrada | Product | Alta |
| Estado vazio com CTA em todas as seções | UX | Média |
| Tooltips contextuais na primeira visita | UX | Alta |
| Tutorial guiado opcional (skip disponível) | Product | Alta |

---

### Sprint 8 — PWA (Progressive Web App)

**Decisão de produto:** após a web estar completa e estável, ir direto para PWA — sem etapa intermediária de "layout responsivo parcial". O PWA já resolve responsividade, instalação no celular e experiência nativa de uma vez.

**O que o PWA entrega:**
- Instala na tela inicial do celular (iOS e Android) sem App Store / Play Store
- Abre como app nativo (sem barra de endereço do navegador)
- Ícone próprio na home screen
- Funciona offline com cache de dados recentes (service worker)
- Notificações push (futura — após PWA base)

**O que precisa ser feito:**

| Item | Descrição | Complexidade |
|---|---|---|
| `manifest.json` | Nome, ícones, cor de fundo, `display: standalone` | Baixa |
| Service Worker | Cache de assets e dados recentes (Workbox) | Média |
| Ícones PWA | 192x192 e 512x512 baseados na BrandMark | Baixa |
| Layout mobile — PDV | 1 coluna por vez + navegação por swipe entre status | Alta |
| Layout mobile — KPIs | Stack vertical, cards em full-width | Média |
| Layout mobile — Calendário | View semana/agenda como padrão em telas pequenas | Média |
| Bottom navigation bar | Substituir sidebar lateral por barra inferior no mobile | Alta |
| Splash screen | Tela de carregamento estilizada com a identidade imperial | Baixa |

**Estratégia de breakpoint:**
- `< 768px` → layout mobile (bottom nav, cards empilhados, PDV coluna única)
- `≥ 768px` → layout desktop atual (sidebar lateral, grid completo)

**Tech:** Next.js PWA via `next-pwa` + Workbox. Sem app nativo — mesmo código, instalação via navegador.

---

### Sprint 9+ — Features Novas

| Feature | Motivação | Complexidade |
|---|---|---|
| Upload de fotos para produtos e funcionários | Portfólio visual, identidade | Alta |
| Histórico de clientes por CPF/CNPJ | Fidelidade e recorrência | Alta |
| Notificações push: comanda aberta há X minutos | Operacional PDV (requer PWA) | Média |
| Seletor de cor de destaque (tema) | Personalização | Baixa |
| Right-click na tabela de pedidos (menu de contexto) | UX avançado | Média |
| Paginação com seletor de itens/página | UX tabela | Baixa |
| Admin PIN — proteção de ações específicas (desconto, exclusão) | Segurança | Média |
| Folha de pagamento — conexão real com API (hoje é localStorage) | Dados reais | Alta |

---

## 7. Componentes Bloqueados (Referência Visual)

Estes componentes atingiram qualidade de benchmark visual. **Não modificar.**

| Componente | Arquivo | Por que é referência |
|---|---|---|
| Finance Overview Total | `finance-overview-total.tsx` | Tipografia, hierarquia de dados, uso de cor, animação |
| Finance Categories Sidebar | `finance-categories-sidebar.tsx` | Barras de progresso, layout lateral, densidade de informação |

Todo novo componente deve ser avaliado em relação a esses dois antes de ser considerado pronto.

---

## 8. Stack Técnica Completa

### Frontend
| Lib | Versão | Uso |
|---|---|---|
| Next.js | 14 | Framework React (App Router) |
| React | 18 | UI |
| Tailwind CSS | 3 | Estilização utility-first |
| TanStack Query | v5 | Cache e sincronização de estado servidor |
| Framer Motion | — | Animações na landing page e cards |
| Recharts | — | Gráficos (area, pie, line, sparklines) |
| @hello-pangea/dnd | — | Drag-and-drop Kanban PDV |
| react-big-calendar | — | Calendário Comercial |
| date-fns | — | Manipulação de datas (locale ptBR) |
| nanoid | — | Geração de IDs únicos (comandas) |
| Leaflet | — | Mapa de vendas (com problema — ver P1) |
| lucide-react | — | Ícones |
| next-themes | — | Dark mode |

### Backend
| Lib | Uso |
|---|---|
| NestJS | Framework principal |
| Prisma | ORM |
| PostgreSQL | Banco de dados (Railway) |
| bcrypt | Hash de senhas |
| Nodemailer | Envio de emails |
| class-validator | Validação de DTOs |

### Infra / Tooling
| Ferramenta | Uso |
|---|---|
| Turborepo | Gerenciamento de monorepo |
| pnpm | Package manager |
| Railway | Hosting (web + API + banco) |
| TypeScript | Tipagem completa |

---

## 9. Fluxo de Deploy

```bash
# Da raiz do monorepo (c:/Users/Desktop/Documents/test1)

# Deploy Web
railway up --service 96df3669-4696-4bf1-865f-a2e886f5dc04

# Deploy API
railway service imperial-desk-api
railway up

# Ou alternar de volta para web:
railway service imperial-desk-web
railway up
```

**Projeto Railway:** `successful-charisma`
**Project ID:** `14d830a4-8f92-460a-8152-15987c91efd8`
**Environment:** `production`

---

## 10. Decisões de Produto e Filosofia

### "O que é bom, se copia e se melhora."
O Syncfusion Dashboard foi usado como referência de UX (Kanban, Calendar, Grid com export). Em todos os casos, a implementação do DESK IMPERIAL supera o visual e adiciona contexto de negócio real.

### Open-source por princípio
Nenhuma dependência Syncfusion em produção:
- Zero risco de licença (Community Edition proíbe SaaS comercial)
- Bundle ~8x menor vs Syncfusion
- Controle visual total

### localStorage como camada de configuração local
Configurações que não precisam de persistência no servidor (PIN, payroll config, rate limiter) usam localStorage. Isso reduz latência e evita endpoints desnecessários. A migração para o backend pode acontecer quando houver multi-device ou multi-usuário por conta.

### Dark theme permanente
O DESK IMPERIAL não tem modo claro. O dark imperial é parte da identidade do produto. A feature de "seletor de cor" (Sprint 8+) mantém o dark como base e permite trocar apenas a cor de destaque (verde imperial é o padrão).

### Dados reais > Mock
A plataforma conecta com API real e banco PostgreSQL desde o início. Não há modo demo com dados falsos — o usuário configura e usa dados do seu próprio negócio.

---

*Este documento é o ponto de referência central para todas as decisões de produto, melhorias e revisões do DESK IMPERIAL. Atualizar a cada sprint concluída.*
