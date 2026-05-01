# O Produto - Desk Imperial

**Versao:** 1.1  
**Ultima atualizacao:** 2026-05-01

---

## O que e

O Desk Imperial e um sistema de gestao comercial gratuito, de codigo aberto, feito para pequenos e medios comerciantes brasileiros.

Ele nasceu para resolver um problema concreto: o pequeno comerciante nao consegue pagar por um sistema de PDV profissional e acaba controlando tudo em planilha, caderno ou memoria. Isso gera erro, perda de dinheiro e trava o crescimento.

O Desk Imperial oferece o que esses comerciantes realmente precisam, sem mensalidade.

> Este documento descreve o estado atual conhecido do produto.  
> O mirror aberto e sincronizado por waves, entao a documentacao publica pode cobrir trilhas mais novas antes do sync completo de toda a arvore de codigo.

---

## Para quem e

### Perfil 1 - O dono do negocio

**Quem e:** dono de restaurante, lanchonete, bar, distribuidora ou qualquer comercio com atendimento presencial.

**O que ele precisa:**

- Saber quanto entrou e quanto saiu no dia
- Ver o que a equipe esta fazendo em tempo real
- Saber quem vende mais e quem precisa melhorar
- Calcular salario e comissao sem fazer conta na mao
- Ter controle sem precisar estar no balcao o tempo todo

**O que o sistema entrega para ele:**

- Painel financeiro com receita, custo e margem por periodo
- PDV ao vivo com visao de todas as comandas abertas
- Ranking de vendedores e historico por funcionario
- Folha de pagamento automatica (salario fixo + comissao sobre vendas)
- Mapa de onde estao vindo os pedidos
- Acesso via celular com painel executivo mobile
- Admin PIN para proteger acoes sensiveis
- Alertas e comandos de notificacao por Telegram no rollout principal

---

### Perfil 2 - O funcionario

**Quem e:** garcom, atendente, caixa; alguem que trabalha no balcao ou no salao.

**O que ele precisa:**

- Anotar pedido rapido sem complicacao
- Ver o status do atendimento sem precisar perguntar para ninguem
- Acompanhar o que esta pronto para entregar

**O que o sistema entrega para ele:**

- PDV mobile com lista de produtos e abertura de comanda
- Visao do kanban de atendimento em tempo real
- Interface simples, sem precisar de treinamento longo

---

### Perfil 3 - O desenvolvedor

**Quem e:** estudante, desenvolvedor junior ou senior interessado em contribuir, estudar ou usar como base.

**O que ele encontra aqui:**

- Monorepo NestJS + Next.js com arquitetura real de producao
- Dominios operacionais, financeiros, auth, realtime e mobile
- Padroes de seguranca: CSRF, cookies HttpOnly, rate limit, isolamento de workspace
- Trilha publica de recovery do realtime e rollout de observabilidade
- CI completo com gates de qualidade, seguranca, testes e build
- Codigo aberto com licenca MIT

---

## Por que existe

O projeto nasceu a partir de uma necessidade real: um comercio familiar precisava de controle e nao havia uma opcao gratuita e acessivel.

Quando o criador comecou a pesquisar, percebeu que o problema era maior. Muitos pequenos comerciantes brasileiros nao tem acesso a sistemas de gestao porque eles sao caros, complicados ou os dois.

A missao do Desk Imperial e simples: **tirar o comerciante brasileiro da planilha.**

Codigo aberto porque a transparencia gera confianca. Gratuito porque e para quem precisa, nao para quem pode pagar.

---

## O que o produto entrega hoje

### Funcional e rodando em producao

| Modulo                          | Status                |
| ------------------------------- | --------------------- |
| PDV / Comandas                  | Producao              |
| Operacao em tempo real          | Producao              |
| Financeiro com KPIs por periodo | Producao              |
| Folha de pagamento automatica   | Producao              |
| Gestao de equipe e ranking      | Producao              |
| Calendario comercial            | Producao              |
| Mapa de vendas por regiao       | Producao              |
| Export CSV                      | Producao              |
| Admin PIN com rate limit        | Producao              |
| Mobile dono                     | Producao              |
| Mobile funcionario              | Producao              |
| Autenticacao segura             | Producao              |
| Insight IA (Gemini)             | Producao              |
| LGPD / consentimento            | Producao              |
| Rollout Telegram empresarial    | Em expansao           |
| Observabilidade com Sentry      | Em rollout por wave   |
| Recovery do realtime            | Em execucao por waves |

### Em evolucao

| Trilha                             | Status                     |
| ---------------------------------- | -------------------------- |
| Importacao CSV de produtos         | Em revisao                 |
| Monitoramento de erros em producao | Em implantacao progressiva |
| Cobertura de testes frontend       | Parcial                    |
| Sync completo do mirror aberto     | Incremental por wave       |

---

## O que o produto nao e

- **Nao e um ERP completo.** O foco e o pequeno comerciante, nao uma empresa com multiplos departamentos.
- **Nao e um aplicativo de entrega.** Nao tem integracao com iFood, Rappi ou similares.
- **Nao tem plano pago.** E gratuito por decisao de produto, nao por ser beta.
- **Nao e um produto acabado.** Esta em evolucao ativa. Funciona, mas ainda tem trilhas abertas de realtime, observabilidade e sync publico.

---

## Acesso

- **Producao:** [app.deskimperial.online](https://app.deskimperial.online)
- **API:** [api.deskimperial.online](https://api.deskimperial.online/api/health)
- **Demo:** [docs/DEMO.md](../DEMO.md)

---

## Licenca

MIT. Use, modifique e distribua livremente. Veja [LICENSE](../../LICENSE).
