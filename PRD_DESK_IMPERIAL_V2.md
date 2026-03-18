# PRD — DESK IMPERIAL v2.0
**Product Requirements Document**
**Tech Lead:** Claude · **Data:** 2026-03-18 · **Status:** Aprovado para implementação

---

## Visão Geral

DESK IMPERIAL é um dashboard financeiro e operacional para gestão de estabelecimentos comerciais.
Este PRD documenta as features da v2.0, inspiradas em padrões do Syncfusion Dashboard (explorado em `localhost:3001`)
e nas demandas diretas do usuário. **Nenhuma dependência Syncfusion** — tudo com open-source.

### Filosofia de Produto
> "O que é bom, se copia e se melhora."

O Syncfusion entregou bons padrões de UX (Kanban, Calendar, Grid com export). O DESK IMPERIAL
já superou o visual do Syncfusion em vários pontos (`finance-overview-total`, `finance-categories-sidebar`
são benchmarks que o Syncfusion não alcança). A v2.0 pega o melhor dos dois mundos.

---

## O que o Syncfusion faz bem → e como superamos com open-source

| Feature Syncfusion | Componente deles | Nossa versão open-source | Status |
|--------------------|-----------------|--------------------------|--------|
| Kanban Board | `@syncfusion/ej2-react-kanban` | `@hello-pangea/dnd` | A fazer |
| Calendar/Schedule | `@syncfusion/ej2-react-schedule` | `react-big-calendar` | A fazer |
| Data Grid (sort, filter, export) | `@syncfusion/ej2-react-grids` | Tabelas customizadas + `react-csv` | A fazer |
| Sparklines inline | `@syncfusion/ej2-react-charts` | Recharts `<Sparkline>` (já temos Recharts) | A fazer |
| Theme toggle (light/dark) | ContextProvider | next-themes (já instalado) | A fazer |
| Rich text editor | `@syncfusion/ej2-react-richtexteditor` | `@tiptap/react` | Baixa prioridade |
| Color picker | `@syncfusion/ej2-react-inputs` | `react-colorful` | Baixa prioridade |

**Vantagem de não usar Syncfusion em produção:**
- Zero risco de licença (Community Edition proíbe SaaS >$1M / >5 devs)
- Bundle ~8x menor (Syncfusion = ~3MB; nossas libs combinadas = ~400KB)
- Total controle visual — nosso design já é superior ao tema Syncfusion

---

## Features da v2.0

### 1. PDV / Comandas (PRIORIDADE ALTA)

**Inspiração Syncfusion:** A página `/kanban` do Syncfusion tem um board com colunas arrastáveis
(Open → In Progress → Review → Validate → Close). Adaptamos para o contexto de restaurante/bar/varejo.

**O que entregar:**
- Nova rota: `/dashboard/pdv`
- Board Kanban com 4 colunas: **Aberta → Em Preparo → Pronta → Fechada**
- Cada card de comanda: número, mesa/cliente, itens, valor total, tempo aberto
- Drag-and-drop entre colunas
- Botão "+ Nova Comanda" → modal com seleção de produtos
- Toggle de Desconto (%) e Acréscimo (%) por comanda
- Badge de status colorido (verde=pronta, amarelo=preparo, vermelho=cancelada)
- Identificação do cliente: **CPF / CNPJ / Anônimo** (ver feature 6)

**Melhoria sobre o Syncfusion:**
- O Kanban deles é genérico (tarefas de dev). O nosso tem contexto de negócio:
  tempo em aberto, valor acumulado, identidade do cliente, descontos

**Tech:** `@hello-pangea/dnd` (fork mantido do `react-beautiful-dnd`)

**Dados:**
```typescript
interface Comanda {
  id: string
  status: 'aberta' | 'em_preparo' | 'pronta' | 'fechada' | 'cancelada'
  mesa?: string
  clienteNome?: string
  clienteCpfCnpj?: string
  itens: ComandaItem[]
  desconto: number        // percentual 0-100
  acrescimo: number       // percentual 0-100
  totalBruto: number
  totalLiquido: number
  abertaEm: Date
  fechadaEm?: Date
  operadorId: string
}

interface ComandaItem {
  produtoId: string
  nome: string
  quantidade: number
  precoUnitario: number
  observacao?: string
}
```

---

### 2. Gestão de Funcionários com Salário (PRIORIDADE ALTA)

**Inspiração Syncfusion:** A página `/employees` tem grid com Name, Designation, Country, HireDate,
Reports To. Boa estrutura de grid — mas sem nenhuma lógica de negócio (sem salário, sem comissão).

**O que entregar:**
- Seção "Equipe" dentro do dashboard (nova aba no sidebar ou sub-seção)
- Grid de funcionários com: Nome, Cargo, Data Contratação, Salário Base, % Vendas, Comissão do Mês, Total a Pagar
- Cálculo automático: `totalAPagar = salárioBase + (vendasDoMês * percentualVendas / 100)`
- Botão "+ Funcionário" → modal de cadastro
- Edição inline de salário base e % comissão
- Card de resumo: Folha total do mês, maior comissionado, menor custo

**Melhoria sobre o Syncfusion:**
- Grid deles é só leitura de dados estáticos. O nosso calcula folha de pagamento em tempo real
  com base nas vendas reais do período selecionado

**Dados:**
```typescript
interface Funcionario {
  id: string
  nome: string
  cargo: string
  email: string
  telefone?: string
  fotoUrl?: string       // upload admin-only
  dataContratacao: Date
  salarioBase: number
  percentualVendas: number  // 0-30%
  ativo: boolean
}

interface FolhaMensal {
  funcionarioId: string
  periodo: string        // 'YYYY-MM'
  salarioBase: number
  vendasAtribuidas: number
  comissao: number
  totalAPagar: number
}
```

---

### 3. Calendário de Atividades Comerciais (PRIORIDADE ALTA)

**Inspiração Syncfusion:** A página `/calendar` usa `ScheduleComponent` com views Day/Week/Month/Agenda.
É o ponto mais forte do Syncfusion — mas podemos replicar com `react-big-calendar`.

**O que entregar:**
- Substituir o form simples de atividades em Configurações por um **calendário visual interativo**
- Nova sub-seção: `/dashboard/configuracoes#calendario` ou modal full-screen
- Views: Mês (padrão), Semana, Dia, Agenda
- Tipos de atividade com cores distintas:
  - 🔴 **Evento** (show, festa, evento especial)
  - 🟡 **Jogo** (transmissão esportiva)
  - 🟢 **Promoção** (happy hour, desconto especial)
  - 🔵 **Reunião** (interna)
  - ⚪ **Outro**
- Click no dia → modal de criação com: nome, tipo, hora início/fim, descrição, impacto esperado (%)
- Drag-and-drop para mover eventos
- Exibição no dashboard overview (próximos 3 eventos)

**Melhoria sobre o Syncfusion:**
- O deles é calendário genérico. O nosso tem tipos semânticos de negócio (Evento, Jogo, Promoção)
  e campo "impacto esperado" para correlacionar com as vendas reais do dia

**Tech:** `react-big-calendar` + `date-fns` (já instalado)

---

### 4. Admin PIN (Proteção de Ações Sensíveis) (PRIORIDADE MÉDIA)

**Inspiração Syncfusion:** O Syncfusion não tem isso. É uma feature nativa do nosso produto.

**O que entregar:**
- Configurável em Configurações → Segurança: **PIN de 4 dígitos + email de confirmação**
- Quando ativado, o PIN é solicitado antes de:
  - Registrar novo produto
  - Dar desconto acima de X% em comanda
  - Fazer upload de foto
  - Excluir funcionário ou produto
  - Alterar salário de funcionário
- UI: Modal com 4 inputs individuais (estilo bancário), auto-focus, máscara numérica
- PIN errado 3x → bloqueia por 5 minutos, envia email
- PIN pode ser redefinido via email cadastrado

**Fluxo de dados:**
```typescript
interface AdminPinConfig {
  ativo: boolean
  pinHash: string         // bcrypt no backend
  emailConfirmacao: string
  tentativasFalhas: number
  bloqueadoAte?: Date
  acoesProtegidas: AdminAction[]
}

type AdminAction =
  | 'produto.criar'
  | 'produto.editar'
  | 'desconto.aplicar'
  | 'foto.upload'
  | 'funcionario.excluir'
  | 'funcionario.salario'
```

---

### 5. Upload de Fotos (Produtos e Funcionários) (PRIORIDADE MÉDIA)

**Inspiração Syncfusion:** O grid de Employees deles usa avatares com URLs estáticas.
O nosso vai ter upload real.

**O que entregar:**
- Campo de upload em formulários de Produto e Funcionário
- Drag-and-drop ou click para selecionar
- Preview imediato antes de salvar
- Requer PIN de Admin (quando ativado)
- Compressão client-side antes do upload (max 500KB)
- Storage: upload para serviço de objeto (S3 ou Cloudflare R2)
- Fallback: avatar gerado com iniciais do nome (estilo Gmail)

**Tech:** `react-dropzone` + Sharp no backend para redimensionamento

---

### 6. Identificação de Cliente: CPF / CNPJ / Anônimo (PRIORIDADE MÉDIA)

**Inspiração Syncfusion:** A página `/customers` tem email + nome. Nós precisamos de CPF/CNPJ
para emissão fiscal e fidelidade.

**O que entregar:**
- No formulário de ordem/comanda: campo de identificação do cliente
- 3 modos de input detectados automaticamente:
  - **CPF** (11 dígitos) → máscara `000.000.000-00` + validação de dígitos verificadores
  - **CNPJ** (14 dígitos) → máscara `00.000.000/0000-00` + validação
  - **Anônimo** → sem identificação (padrão)
- Busca de cliente existente: ao digitar CPF/CNPJ, busca na base → pré-preenche nome
- Histórico: ver pedidos anteriores do cliente no modal

**Tech:** Algoritmo de validação de CPF/CNPJ (puro JS, sem lib)

---

### 7. Melhorias no Dashboard Overview (PRIORIDADE MÉDIA)

**Inspiração Syncfusion:** A página inicial deles tem **SparkLine charts inline** nos cards de KPI
(pequenos gráficos de linha que mostram a tendência dos últimos 7 dias).
Isso é muito mais informativo que números estáticos.

**O que entregar:**
- Cards de métricas (`metric-card.tsx`) ganham sparkline de 7 dias
- Usando Recharts `<ResponsiveContainer>` com `<LineChart>` mínimo (sem eixos, sem tooltip, só a linha)
- Cores: tendência positiva = verde (#36f57c), negativa = vermelho (#ef4444)
- "Próximos Eventos" widget: lista os 3 próximos eventos do calendário comercial
- Notificações inline: comanda aberta há mais de X minutos → badge amarelo

---

### 8. Melhorias na Tabela de Pedidos (PRIORIDADE BAIXA)

**Inspiração Syncfusion:** A página `/orders` tem export para Excel/PDF, filtros avançados,
ordenação por qualquer coluna, e menu de contexto (right-click).

**O que entregar em `finance-orders-table.tsx`:**
- Export CSV dos pedidos filtrados → `react-csv`
- Filtro por status com chips clicáveis (já existe parcialmente, melhorar)
- Ordenação por qualquer coluna (click no header)
- Right-click na linha → menu de contexto: Ver detalhes, Cancelar, Exportar linha
- Paginação com seletor de itens por página (10/25/50)

---

### 9. ThemeSettings Persistente (PRIORIDADE BAIXA)

**Inspiração Syncfusion:** O painel de configurações deles (gear icon bottom-right) persiste
a preferência de cor e dark/light no localStorage. O DESK IMPERIAL já tem dark mode via next-themes
mas não tem preferência de cor primária.

**O que entregar:**
- Painel flutuante (gear icon bottom-right, já existe no Syncfusion como referência)
- Seletor de cor de destaque: Verde Imperial (padrão), Azul, Roxo, Âmbar
- Persiste em `localStorage` e/ou perfil do usuário no backend
- Live preview imediato ao trocar

---

## Roadmap de Implementação

### Sprint 1 (v2.0 MVP)
| Feature | Esforço estimado | Prioridade |
|---------|-----------------|------------|
| PDV/Comandas - Kanban básico (sem drag, só colunas) | 2 dias | CRÍTICA |
| PDV - Drag & drop entre colunas | 1 dia | CRÍTICA |
| PDV - Nova comanda + itens | 1 dia | ALTA |
| Calendário Comercial (react-big-calendar) | 2 dias | ALTA |

### Sprint 2 (v2.1)
| Feature | Esforço estimado | Prioridade |
|---------|-----------------|------------|
| Funcionários - Grid + Salário | 2 dias | ALTA |
| Funcionários - Cálculo de Folha | 1 dia | ALTA |
| Admin PIN (front + back) | 1 dia | MÉDIA |
| CPF/CNPJ no formulário de ordem | 1 dia | MÉDIA |

### Sprint 3 (v2.2)
| Feature | Esforço estimado | Prioridade |
|---------|-----------------|------------|
| Upload de fotos | 2 dias | MÉDIA |
| Sparklines nos cards de KPI | 0.5 dia | MÉDIA |
| Export CSV tabela de pedidos | 0.5 dia | BAIXA |
| ThemeSettings flutuante | 1 dia | BAIXA |

---

## Dependências a Instalar

```bash
# Sprint 1
pnpm add @hello-pangea/dnd          # Kanban drag-and-drop
pnpm add react-big-calendar         # Calendário
pnpm add date-fns                   # Já instalado? Confirmar

# Sprint 2
# Nenhuma dep nova - CPF/CNPJ é algoritmo puro

# Sprint 3
pnpm add react-dropzone             # Upload de fotos
pnpm add react-csv                  # Export CSV
```

---

## Componentes a Criar

```
apps/web/
├── app/dashboard/
│   ├── pdv/
│   │   └── page.tsx                    # Página PDV/Comandas
│   └── page.tsx                        # Adicionar widget "Próximos Eventos"
├── components/
│   ├── pdv/
│   │   ├── pdv-board.tsx               # Board Kanban com colunas
│   │   ├── pdv-comanda-card.tsx        # Card de comanda
│   │   ├── pdv-comanda-modal.tsx       # Modal nova/editar comanda
│   │   └── pdv-column.tsx             # Coluna do kanban
│   ├── calendar/
│   │   ├── commercial-calendar.tsx     # Calendário de atividades
│   │   └── activity-event-modal.tsx   # Modal de evento
│   ├── employees/
│   │   ├── employees-grid.tsx          # Grid de funcionários
│   │   ├── employee-form-modal.tsx    # Modal cadastro/edição
│   │   └── payroll-summary-card.tsx   # Card resumo da folha
│   ├── admin-pin/
│   │   ├── admin-pin-dialog.tsx       # Dialog do PIN
│   │   └── use-admin-pin.ts           # Hook de proteção
│   └── dashboard/
│       ├── metric-card.tsx            # MELHORAR: adicionar sparkline
│       └── upcoming-events-widget.tsx # Widget próximos eventos
```

---

## Comparativo Final: DESK IMPERIAL v2 vs Syncfusion Template

| Critério | Syncfusion Template | DESK IMPERIAL v2 |
|----------|--------------------|--------------------|
| Visual / UX | Bom (Material theme) | Superior (dark imperial, verde, typography) |
| Kanban | Genérico (tarefas de dev) | Contexto de negócio (comandas, PDV) |
| Calendário | Completo mas genérico | Calendário de atividades comerciais com impacto $ |
| Funcionários | Grid estático | Folha de pagamento dinâmica com comissão |
| Clientes | Nome + email | CPF/CNPJ + histórico de compras |
| Segurança | Nenhuma | Admin PIN + email 2FA |
| Licença | Risco SaaS (Community Limits) | 100% open-source |
| Bundle | ~3MB (Syncfusion libs) | ~400KB (nossas libs combinadas) |
| Personalização | Limitada (tema Syncfusion) | Total (nosso design system) |
| Dados reais | Mock only | API real (NestJS + PostgreSQL) |

---

## Decisão de Produto

**O Syncfusion é bom como referência de UX.** Mas o DESK IMPERIAL, ao seguir este PRD,
vai entregar um produto com:
- Melhor visual (já provado nos componentes travados)
- Melhor contexto de negócio (PDV, Folha, Comissão são reais)
- Zero risco de licença
- Dados reais de vendas, não mock

**Próximo passo recomendado:** Implementar Sprint 1 — PDV/Comandas e Calendário Comercial.
São as features com maior impacto visual e de produto.
