# Sistema Visual — Desk Imperial

## Direção aprovada

O frontend deve seguir uma linha **admin dashboard direto, limpo e funcional**, mais próxima de TailAdmin, next-shadcn-admin-dashboard e free-react-tailwind-admin-dashboard.

## Decisão visual

- Usar a página inteira, sem “ilha” central envolvendo todo o produto.
- Sidebar encostada no canto esquerdo, fixa e com largura próxima de `290px`.
- Topbar encostada no topo, alinhada ao conteúdo e com borda inferior simples.
- Conteúdo com espaçamento controlado, mas sem sensação de cartão gigante flutuando.
- Paleta principal: preto, branco, cinzas e azul.
- Remover dourado, roxo, glow decorativo e aparência de dashboard conceitual.

## Referências que devem guiar a execução

- TailAdmin: estrutura de sidebar, topbar, cards simples e gráficos ApexCharts.
- next-shadcn-admin-dashboard: header compacto, sidebar com grupos, cards com badge e gráfico de área.
- free-react-tailwind-admin-dashboard: métrica direta, borda leve, bg branco/dark e azul `#465fff`.

## Anti-padrões proibidos

- Layout em ilha grande.
- Blocos conceituais sem ligação com tela real.
- Dourado, roxo e gradiente decorativo.
- Cards enormes com texto de apresentação.
- Visual “premium” demais sem função.
- Mockup que pareça landing page ou showcase.

## Assinatura desejada

O Desk Imperial deve parecer um admin real de comércio: sidebar, topbar, métricas, gráficos e tabelas. A identidade vem da escolha dos dados e nomes do produto, não de efeitos visuais.

## Aplicação segura

1. Prototipar primeiro em `apps/web/app/design-lab`.
2. Validar visualmente com o usuário.
3. Só depois migrar para `DashboardShell`, `DashboardSidebar`, `MetricCard`, `FinanceChart` e telas reais.
