# Auditoria Web: Notebooks, Microbooks e MacBooks

Data: 2026-05-16

## Objetivo

Garantir que a experiência web do Desk Imperial não trate notebook pequeno como desktop grande. A faixa crítica fica entre 1024px e 1366px de largura: MacBook Air/Pro em escala padrão, notebooks 13", microbooks, telas HD e janelas divididas.

## Matriz de referência

| Classe de tela                       | Largura útil | Comportamento esperado                                                                                               |
| ------------------------------------ | -----------: | -------------------------------------------------------------------------------------------------------------------- |
| Tablet horizontal / microbook mínimo |  1024-1079px | Shell compacto, navegação sem quebra horizontal, conteúdo ainda pode empilhar quando necessário.                     |
| Notebook pequeno                     |  1080-1179px | Ativar grids de conteúdo + trilho lateral quando couber; ocultar metadado de período no topo para liberar navegação. |
| MacBook 13 / notebook comum          |  1180-1279px | KPIs podem usar 4 colunas; telas principais devem evitar coluna única longa.                                         |
| Notebook HD / 1366px                 |  1280-1439px | Layout completo compacto; trilhos laterais entre 300px e 360px.                                                      |
| Desktop amplo                        |      1440px+ | Layout completo com mais respiro, sem depender de largura excessiva para funcionar.                                  |

## Problemas encontrados

- Muitas telas internas usavam apenas `xl:` como primeiro ponto de layout desktop. Isso empilhava painéis em 1024-1279px, criando scroll longo e sensação de sistema pesado.
- O topo wireframe mantinha período/metadados visíveis em microbook, disputando espaço com a navegação principal.
- O grid padrão de quatro métricas só ativava em `2xl`, deixando MacBook/notebook com KPIs em duas colunas mesmo quando havia espaço.
- Várias telas repetiam a fórmula `conteúdo + rail`, mas cada arquivo recriava o breakpoint manualmente.

## Correções aplicadas

- Criado um conjunto comum de classes em `apps/web/app/globals.css`:
  - `workspace-notebook-split`: conteúdo principal + trilho lateral a partir de 1080px.
  - `workspace-notebook-duo`: duas áreas equilibradas a partir de 1080px.
  - `workspace-notebook-metrics`: 2 colunas em tablet largo e 4 colunas a partir de 1080px.
- Ajustado header wireframe para 1024-1279px:
  - navegação mais compacta;
  - título menor;
  - período oculto entre 1024-1179px;
  - resumo de seção com wrap seguro.
- Ajustado `LAB_RESPONSIVE_FOUR_UP_GRID` para ativar quatro KPIs em `min-[1180px]`, não só em `2xl`.
- Migradas telas principais para os novos utilitários:
  - overview principal;
  - overview operacional;
  - financeiro;
  - PDV catálogo;
  - PDV cobrança;
  - portfolio;
  - configurações;
  - estado de loading do dashboard.

## Regra de projeto

Para telas web administrativas, `xl:` não deve ser o primeiro breakpoint de layout desktop quando existir trilho lateral, KPIs ou painel de resumo. Use a faixa de notebook:

- `workspace-notebook-split` para `conteúdo + painel lateral`;
- `workspace-notebook-duo` para dois painéis com peso parecido;
- `workspace-notebook-metrics` para KPIs e cartões de leitura rápida;
- `xl:` deve ser refinamento, não o primeiro ponto em que a tela deixa de ser empilhada.

## Critérios de revisão

Antes de aprovar uma tela nova ou refatorada, conferir:

- 1024px: sem overflow horizontal e sem header espremido.
- 1180px: KPIs e painéis críticos não devem virar uma página excessivamente longa.
- 1280px: layout de notebook precisa parecer intencional, não versão quebrada do desktop.
- 1366px: dashboard deve manter leitura rápida, com trilho lateral visível quando houver utilidade real.
- 1440px+: só aumentar respiro; não depender desse tamanho para funcionar.

## Validação executada

- `npm --workspace @partner/web run typecheck`
- `npm --workspace @partner/web run lint`
- `npm --workspace @partner/web run build`
- Auditoria Playwright local em `/design-lab/overview`, `/design-lab/pdv`, `/design-lab/financeiro`, `/design-lab/portfolio` e `/design-lab/salao` nos viewports 1024x768, 1180x800, 1280x832 e 1366x768.

Resultado da auditoria visual: `0px` de overflow horizontal e nenhum elemento detectado ultrapassando a viewport nos 20 cenários. O lint permaneceu com warnings antigos não-falhantes; nenhum erro novo foi introduzido.
