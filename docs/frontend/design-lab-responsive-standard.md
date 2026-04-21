# Design-Lab Responsive Standard

Data: 2026-04-20  
Status: ativo para o desktop web do `design-lab`

## Objetivo

Definir um contrato único de equidade e responsividade para as superfícies desktop do Desk Imperial.

Equidade, aqui, significa uma coisa prática: o mesmo dado precisa continuar legível, proporcional e acionável em desktop médio, desktop largo e tablet horizontal, sem virar uma versão pior do produto.

## Escopo

Aplica-se a:

- `apps/web/components/design-lab/*`
- `apps/web/components/dashboard/environments/*` quando renderizados como desktop oficial do lab
- superfícies de resumo, KPI, radar, leitura rápida e cabeçalhos de seção

Não se aplica diretamente a:

- tabelas densas de entidades
- textos longos de settings/compliance
- shells móveis `owner-mobile` e `staff-mobile`

## Contrato oficial

### 1. Grid de quatro métricas

Quatro KPIs lado a lado só aparecem em desktop realmente largo.

- padrão obrigatório: `LAB_RESPONSIVE_FOUR_UP_GRID`
- valor atual: `sm:grid-cols-2 2xl:grid-cols-4`

Regra:

- mobile: 1 coluna
- `sm` até `xl`: 2 colunas
- `2xl+`: 4 colunas

Motivo: em `1366px`, quatro números monetários grandes por linha quebram centavos, comprimem captions e produzem ruído visual.

### 2. Tipografia numérica

Números não podem usar `break-words`.

Classes oficiais:

- `LAB_NUMERIC_HERO_CLASS`: número dominante da tela
- `LAB_NUMERIC_SECTION_CLASS`: KPI principal de seção
- `LAB_NUMERIC_COMPACT_CLASS`: KPI secundário, mini-stat e strip

Obrigatório em valores monetários, percentuais e contagens de destaque:

- `tabular-nums`
- `whitespace-nowrap`
- `overflow-hidden`

Proibido:

- `break-words` em KPI
- fontes grandes sem clamp
- quatro classes diferentes de número para o mesmo tipo de dado

### 3. Vazios não podem virar buracos

Quando a fonte real ainda não tiver densidade suficiente:

- reduzir a área útil vazia
- preencher com sinais curtos, fatos e próximos passos
- evitar parágrafo genérico ocupando o lugar de dado

Padrão:

- `LabEmptyState` compacto
- `LabFactPill`
- `LabSignalRow`

### 4. Grids assimétricas

Quando a composição usar coluna fixa + coluna fluida:

- alinhar com `xl:items-start`
- impedir que o painel menor estique artificialmente

Padrão:

- `xl:grid-cols-[400px_minmax(0,1fr)] xl:items-start`
- ou variação equivalente conforme a seção

### 5. Texto e contraste

- labels e captions podem quebrar linha
- números principais não quebram
- zero, vazio e placeholder usam tom secundário/terciário
- o contraste precisa continuar AA em light/dark

## Checklist de entrega

Antes de considerar uma seção “fechada”, validar:

1. nenhum valor grande joga centavos para a linha de baixo
2. nenhuma faixa de KPI usa 4 colunas antes de `2xl`
3. nenhum empty state deixa bloco morto dominante
4. nenhuma rail lateral estica altura só para “acompanhar” o painel vizinho
5. light e dark continuam coerentes

## Auditoria visual mínima

Toda superfície com KPIs ou números grandes deve ser revisada com screenshot em:

- `1366x768`
- `1024x768`

Quando houver tema:

- light
- dark

## Referência de implementação

Arquivo-base:

- `apps/web/components/design-lab/lab-primitives.tsx`

Constantes oficiais:

- `LAB_RESPONSIVE_FOUR_UP_GRID`
- `LAB_NUMERIC_HERO_CLASS`
- `LAB_NUMERIC_SECTION_CLASS`
- `LAB_NUMERIC_COMPACT_CLASS`

## Regra operacional

Se uma nova seção desktop não conseguir obedecer este contrato com o componente antigo:

- encapsular o componente
- adaptar a superfície visual
- nunca “forçar” o componente legado a quebrar o shell do lab
