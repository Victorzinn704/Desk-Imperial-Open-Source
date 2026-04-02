# Demo — Desk Imperial

**Versão:** 1.0  
**Última atualização:** 2026-04-01

---

## Acesso rápido

Você pode explorar o Desk Imperial agora sem criar uma conta.

**URL:** [app.deskimperial.online](https://app.deskimperial.online)  
**E-mail:** `demo@deskimperial.online`  
**Senha:** `Demo@2024`

---

## O que você vai ver

O ambiente de demo é uma conta real com dados pré-carregados. Você terá acesso como **OWNER** — o papel do dono do negócio.

O que está disponível para explorar:

| Módulo                 | O que fazer                                               |
| ---------------------- | --------------------------------------------------------- |
| **PDV / Comandas**     | Abrir comanda, adicionar itens, mover pelo kanban, fechar |
| **Financeiro**         | Ver KPIs do período, ranking de produtos e vendedores     |
| **Folha de Pagamento** | Ver cálculo automático de salário + comissão              |
| **Gestão de Equipe**   | Ver funcionários e histórico de vendas                    |
| **Calendário**         | Ver e criar eventos comerciais                            |
| **Mapa de Vendas**     | Ver de onde vieram os pedidos                             |
| **Insight IA**         | Gerar resumo executivo via Gemini                         |
| **Admin PIN**          | Testar proteção de ações sensíveis                        |

---

## Limitações do modo demo

### Tempo de sessão

A conta demo tem um limite de **20 minutos por dispositivo por dia**.

O contador começa quando você faz login. Ao atingir o limite, o sistema encerra a sessão automaticamente. No dia seguinte, o contador zera e você pode acessar novamente.

**Por que existe esse limite:** a conta demo é compartilhada. O limite protege os dados de todos que a usam e evita abusos.

### O que não está disponível no demo

- **Criar sua própria conta:** o demo é uma conta de avaliação, não um workspace próprio
- **Configurar integrações reais:** e-mail, Brevo, chaves de API externas
- **Dados persistem para todos os usuários:** o que você criar ou modificar pode aparecer para outra pessoa que acesse depois

### Dados no demo

Os dados pré-carregados são fictícios e representativos de um pequeno comércio. Eles podem ser modificados por qualquer pessoa que use a conta.

---

## Criando sua própria conta

Para ter um workspace próprio, isolado e sem limite de tempo:

1. Acesse [app.deskimperial.online/cadastro](https://app.deskimperial.online/cadastro)
2. Preencha nome, e-mail e senha
3. Confirme o e-mail (link enviado via Brevo)
4. Configure seu negócio — nome, endereço, produtos, equipe

**É gratuito.** Sem plano pago, sem trial, sem cartão de crédito.

---

## Para desenvolvedores

Se você quer rodar o sistema localmente com dados de demonstração, siga o guia em [docs/GETTING-STARTED.md](GETTING-STARTED.md).

As variáveis de ambiente relacionadas ao demo:

```env
DEMO_ACCOUNT_EMAIL=demo@deskimperial.online
DEMO_DAILY_LIMIT_MINUTES=20
```

O controle de acesso do demo é gerenciado pelo `DemoAccessService` (`apps/api/src/modules/auth/demo-access.service.ts`). O sistema registra um `DemoAccessGrant` por sessão, rastreando o IP (hasheado), o tempo utilizado e o limite diário por dispositivo.
