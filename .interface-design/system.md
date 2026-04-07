# Sistema Visual — Desk Imperial

## Direção aprovada

O frontend deve seguir uma linha **admin dashboard direto, limpo e funcional**, mais próxima de TailAdmin, next-shadcn-admin-dashboard e free-react-tailwind-admin-dashboard.

## Decisão visual

- Usar a página inteira, sem “ilha” central envolvendo todo o produto.
- Sidebar encostada no canto esquerdo, fixa, mais enxuta: `248px` aberta e `76px` recolhida.
- Sidebar precisa ter modo recolhido com ícones, preservando a navegação no canto sem ocupar largura excessiva.
- Topbar encostada no topo, compacta, estável e alinhada ao conteúdo, com altura próxima de `58px`.
- Conteúdo com espaçamento controlado, mas sem sensação de cartão gigante flutuando.
- Paleta principal: preto, branco, cinzas e azul vivo.
- Azul base aprovado para protótipo: `#008CFF`; evitar o azul `#465fff` quando ele parecer robótico ou genérico.
- O tema escuro deve ser literalmente preto/cinza com azul como ação e estado principal.
- O tema claro deve ser predominantemente branco, com bordas cinza leves e azul como marca/ação.
- Remover dourado, roxo, glow decorativo e aparência de dashboard conceitual.

## Referências que devem guiar a execução

- TailAdmin: estrutura de sidebar, topbar, cards simples e gráficos ApexCharts.
- TailAdmin Logistics: usar lógica de operações em movimento — etapas, tracking, canais, rotas e tabela — traduzida para pedidos, caixa, salão, retirada e delivery do Desk.
- next-shadcn-admin-dashboard: header compacto, sidebar com grupos, cards com badge e gráfico de área.
- free-react-tailwind-admin-dashboard: métrica direta, borda leve, bg branco/dark e estrutura de gráficos ApexCharts.

## Anti-padrões proibidos

- Layout em ilha grande.
- Blocos conceituais sem ligação com tela real.
- Dourado, roxo e gradiente decorativo.
- Azul frio/robótico aplicado sem função.
- Sidebar larga demais para a densidade do produto.
- Topbar com busca e ações desalinhadas ou esmagadas.
- Cards enormes com texto de apresentação.
- Visual “premium” demais sem função.
- Mockup que pareça landing page ou showcase.

## Assinatura desejada

O Desk Imperial deve parecer um admin real de comércio: sidebar, topbar, métricas, gráficos e tabelas. A identidade vem da escolha dos dados e nomes do produto, não de efeitos visuais.

## Aplicação segura

1. Prototipar primeiro em `apps/web/app/design-lab`.
2. Validar visualmente com o usuário.
3. Só depois migrar para `DashboardShell`, `DashboardSidebar`, `MetricCard`, `FinanceChart` e telas reais.
