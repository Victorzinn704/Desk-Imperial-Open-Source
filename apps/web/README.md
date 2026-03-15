# apps/web

Aplicacao frontend em Next.js.

## Objetivo

Concentrar:

- home institucional
- login e cadastro
- area do cliente
- dashboards
- componentes de UX/UI
- integracao com a API

## Estrutura interna

- `app/(marketing)`: home, planos, empresa e materiais publicos
- `app/(auth)`: login, cadastro, recuperacao de senha e aceite de termos
- `app/(dashboard)`: painel do cliente, produtos, financeiro, mapa e consentimentos
- `components/shared`: botoes, campos, modais, tabelas e feedbacks
- `components/marketing`: secoes da home
- `components/auth`: formularios e fluxos de autenticacao
- `components/dashboard`: cards, filtros, tabelas e graficos
- `hooks`: hooks locais de UI e dados
- `lib`: clients HTTP, validadores e formatadores
- `providers`: query client, tema e contexto de sessao
- `styles`: estilos globais, tokens e utilitarios

## Boas praticas

- manter rotas finas e componentes bem separados
- colocar logica de negocio fora dos componentes visuais
- usar schema validation nos formularios
- nao persistir token sensivel no navegador
