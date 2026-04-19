# Design-Lab Capability Matrix

Data: 2026-04-19
Status: ativo durante a janela de 2 semanas em que o `design-lab` vira a base funcional desktop.

## Objetivo

Registrar o que já existia no produto, o que estava invisível no `design-lab`, e onde cada capability ficou exposta na nova arquitetura.

## Regras desta fase

- O `design-lab` é a entrada funcional desktop.
- O `/dashboard` wireframe entra em freeze funcional e vira referência legada temporária.
- Nenhuma capability existente pode sumir; se não virar seção principal, precisa virar subárea ou alias visível.
- Mobile owner/staff continua em produção e segue como fonte de capacidades maduras.

## Matriz

| Capability | Situação anterior | Fonte real | Exposição no lab agora | Observação |
| --- | --- | --- | --- | --- |
| Overview executivo | Mock no lab | `OverviewEnvironment` | `/design-lab/overview` | Dados reais de finanças e pedidos |
| PDV / Comandas | Protótipo local | `PdvWireframeEnvironment` + operações reais | `/design-lab/pdv` | Bridge temporária para manter função sem perder fluxo |
| Salão / mapa de mesas | Protótipo local | `SalaoEnvironment` | `/design-lab/salao` | Abre PDV real a partir da mesa |
| Pedidos / auditoria | Mock local | `PedidosEnvironment` | `/design-lab/pedidos` | Inclui subárea de histórico consolidado |
| Caixa | Mock local | `CaixaPanel` + `fetchOperationsLive` | `/design-lab/caixa` | Abre/fecha caixa real |
| Cozinha / KDS | Mock local | `KitchenOrdersView` + `fetchOperationsKitchen` | `/design-lab/cozinha` | Reuso direto da superfície mobile/staff |
| Financeiro | Mock local | `FinanceiroEnvironment` | `/design-lab/financeiro` | Tabs reais de leitura financeira |
| Mapa territorial | Oculto fora do lab | `MapEnvironment` | `/design-lab/financeiro?tab=mapa` | Consolidado dentro de Financeiro |
| Calendário | Mock local | `CalendarioEnvironment` | `/design-lab/calendario` | Continua seção própria |
| Portfólio | Mock local | `PortfolioEnvironment` | `/design-lab/portfolio` | Cadastro, busca e mutações reais |
| Equipe | Mock local | `EquipeEnvironment` | `/design-lab/equipe` | Cards e perfil real |
| Folha de pagamento | Mock local | `PayrollEnvironment` | `/design-lab/payroll` | Continua seção própria |
| IA | Fora do lab (`/ai`) | `AIConsultantWorkspace` | `/design-lab/ia` | `/ai` mantido como alias |
| Configurações | Link quebrado no lab | `SettingsEnvironment` | `/design-lab/config` | Conta, segurança, preferências, compliance e sessão |

## Capacidades móveis preservadas

| Capability | Superfície principal | Status |
| --- | --- | --- |
| Owner mobile resumo e operação | `owner-mobile-shell` | Mantido |
| Staff mobile salão / pedido / cozinha | `staff-mobile-shell` | Mantido |
| Realtime operacional | `useOperationsRealtime` | Mantido |
| Offline queue / reconexão | fluxos operations/mobile | Mantido |

## Legado reaproveitável que não vira seção própria

| Legado | Destino |
| --- | --- |
| `sales-environment` | Dissolvido entre Overview, Pedidos, Financeiro e Equipe |
| `/dashboard` wireframe | Freeze funcional temporário |
| `/dashboard?view=settings` | Alias temporário para `design-lab/config` |
| `/dashboard?view=map` | Alias conceitual para `design-lab/financeiro?tab=mapa` |

## Próxima rodada

1. Trocar bridges operacionais que ainda usam visual do dashboard por versões nativas do `design-lab`.
2. Eliminar o restante dos arrays demo nas páginas que ainda estiverem apoiadas em protótipos residuais.
3. Consolidar aliases antigos e reduzir dependência do `/dashboard` congelado.
