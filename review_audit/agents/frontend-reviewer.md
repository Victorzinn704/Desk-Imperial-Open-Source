# Auditoria Frontend - `apps/web`

## Resumo do domínio
O frontend está organizado em três superfícies claras: marketing (`app/page.tsx` + `components/marketing/*`), autenticação (`app/login`, `app/cadastro`, `app/verificar-email`, `app/redefinir-senha`) e operação (`app/app/*` + `app/dashboard`). A arquitetura tem bons sinais de maturidade: tokens centralizados em `app/desk-theme.css`, base visual consistente em `app/globals.css`, queries escopadas por seção em `components/dashboard/hooks/useDashboardQueries.ts` e carregamento sob demanda para partes pesadas em `components/dashboard/dashboard-environments.tsx`.

## Principais riscos
O risco mais alto hoje é a entrega client-only do home/landing, que enfraquece SEO e first paint. Em seguida vêm os fluxos operacionais e de auth resolvidos no cliente, que adicionam spinner/redirect pós-hidratação. Também há um risco de bundle/hidratação no `DashboardShell`, porque ele continua sendo um coordenador muito grande e concentra várias responsabilidades. Por fim, a exportação CSV do financeiro está sem hardening contra CSV/formula injection, e a topbar tem um controle de busca visualmente presente, mas não funcional.

## Achados detalhados

### 1) Home page renderizada sem SSR
Natureza: **Fato confirmado**. Severidade: **Alta**. Impacto: a home pública depende de JavaScript para aparecer, o que piora first paint, reduz acessibilidade para ambientes com JS instável e enfraquece indexação/SEO técnico. Confiança: **alta**.

Evidência: `apps/web/app/page.tsx:3` usa `dynamic(..., { ssr: false })` para montar a landing; `apps/web/components/marketing/landing-page.tsx:1` mostra que a própria landing é um componente client-side com `use client`; `apps/web/components/marketing/landing-page.tsx:600` confirma que o conteúdo de marketing principal está dentro desse componente client-rendered.

Recomendação concreta: manter a camada interativa em client components, mas mover a estrutura semântica principal da home para SSR/Server Components, deixando animações, cursor e efeitos visuais como hidratação opcional. Se a intenção for uma landing rica, vale preservar o HTML-base para crawler e usuários sem JS.

### 2) Autenticação e roteamento das rotas operacionais resolvidos no cliente
Natureza: **Fato confirmado**, com uma **inferência forte** de custo de UX/perf. Severidade: **Média**. Impacto: `/app`, `/app/staff` e `/app/owner` exibem spinner até o `fetchCurrentUser` resolver no cliente, e só então fazem `router.replace(...)` ou montam a shell correta. Isso cria um flash de carregamento, adiciona uma ida ao backend antes de decidir a rota e impede que o servidor entregue a tela certa já pronta. Confiança: **alta**.

Evidência: `apps/web/app/app/page.tsx:1` faz o redirect em `useEffect` após `useQuery`; `apps/web/app/app/page.tsx:25` inicia a decisão de rota no cliente; `apps/web/app/app/staff/page.tsx:1` e `apps/web/app/app/owner/page.tsx:1` repetem o mesmo padrão de busca da sessão, redirect e spinner; `apps/web/components/dashboard/dashboard-shell.tsx:399` também faz gating de sessão, loading e estados de autorização no cliente antes de renderizar o painel.

Recomendação concreta: empurrar a decisão de rota/autorização para o servidor sempre que possível. No mínimo, criar uma rota intermediária server-side que já entregue a superfície correta ou um fallback mais informativo, reduzindo o tempo em estado de loading. Se o contrato de auth exigir client-side, separar melhor o spinner de “decisão de rota” do spinner de “carregando dados”.

### 3) `DashboardShell` ainda é um coordenador grande demais para a superfície atual
Natureza: **Inferência forte**. Severidade: **Média**. Impacto: o shell concentra auth, viewport detection, navegação por URL, realtime, logout, estado de timeline, composição de ambientes e renderização dos estados de loading/erro. Isso aumenta o custo de manutenção e tende a inflar a hidratação do painel, mesmo com parte dos módulos pesados já separada em `dynamic()`. Confiança: **alta**.

Evidência: `apps/web/components/dashboard/dashboard-shell.tsx:1` mostra um conjunto amplo de imports e shells móveis dinâmicos; `apps/web/components/dashboard/dashboard-shell.tsx:399` concentra sessão, queries, navegação, realtime e early returns; `apps/web/components/dashboard/dashboard-shell.tsx:520` mistura layout desktop, loading state, auth lock, email verification lock e subcomponentes de fallback no mesmo arquivo; `apps/web/components/dashboard/dashboard-environments.tsx:12` confirma que a divisão existe, mas ainda deixa o shell como ponto central de orquestração; `apps/web/components/dashboard/hooks/useDashboardQueries.ts:16` mostra que as queries são escopadas por seção, então o problema aqui é menos de fetch e mais de coordenação/hidratação.

Recomendação concreta: continuar a extração incremental, separando o shell em blocos menores por responsabilidade real. Prioridade prática: auth/decisão de acesso, chrome de navegação, e área de conteúdo. A shell já tem uma boa base de divisão por ambientes, então a próxima refatoração deve reduzir o número de responsabilidades por arquivo, não só mover JSX.

### 4) Exportação CSV do financeiro sem hardening contra CSV/formula injection
Natureza: **Fato confirmado**. Severidade: **Média-alta**. Impacto: valores vindos de `customerName`, `channel` e outros campos são exportados sem escape de aspas internas nem proteção contra células que comecem com `=`, `+`, `-` ou `@`. Em planilhas, isso pode corromper o arquivo ou virar fórmula executável. Confiança: **alta**.

Evidência: `apps/web/components/dashboard/finance-orders-table.tsx:44` monta CSV manualmente com `r.map((c) => \`"\${c}"\`).join(',')`, sem escape de aspas internas e sem sanitização de prefixo; `apps/web/components/dashboard/finance-orders-table.tsx:72` expõe esse CSV via ação de download para o usuário final.

Recomendação concreta: centralizar um encoder CSV seguro. No mínimo, duplicar aspas internas, normalizar quebras de linha e prefixar células de risco com apóstrofo quando o conteúdo começar com caracteres de fórmula. Se possível, adotar uma biblioteca pequena e testada para essa serialização.

### 5) Topbar exibe busca sem comportamento e sem affordance acessível completa
Natureza: **Fato confirmado**, com **hipótese de produto** de que isso seja apenas um placeholder visual. Severidade: **Baixa**. Impacto: o usuário vê um campo de busca e um botão `⌘K`, mas não há `onChange`, `onSubmit`, atalho real ou `aria-label` no botão; isso cria expectativa de funcionalidade que ainda não existe e adiciona ruído de acessibilidade/UX. Confiança: **alta** para a ausência de comportamento; **média** para a hipótese de ser placeholder intencional.

Evidência: `apps/web/components/dashboard/dashboard-topbar.tsx:47` renderiza `input` com placeholder, mas sem handler de interação; `apps/web/components/dashboard/dashboard-topbar.tsx:59` renderiza o botão `⌘K` sem `onClick` nem rótulo acessível.

Recomendação concreta: ou ligar essa affordance a uma busca/command palette real, ou removê-la até existir comportamento. Se a intenção for futura, transformar em texto informativo não-interativo evita falsa expectativa e melhora a clareza do chrome.

## Riscos potenciais observados
Há um risco potencial de política de segurança client-side em `apps/web/next.config.ts:18`, `apps/web/next.config.ts:21` e `apps/web/next.config.ts:25`, porque a CSP ainda permite `'unsafe-inline'` em `script-src` e aceita múltiplas origens em `connect-src`. Não tratei isso como achado crítico porque parte dessa permissividade pode ser compatível com a arquitetura atual do Next, mas vale reavaliar quando houver baseline de bundle e observabilidade mais estável.

## Leitura final
O frontend tem boa disciplina em design system, loading states e divisão por seção, especialmente em `components/dashboard/*` e nos componentes de formulário/autenticação. O que mais pesa agora não é falta de cobertura visual, e sim a combinação de home sem SSR, rotas operacionais decididas no cliente e uma superfície de dashboard ainda centralizada demais.
