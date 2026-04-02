# O Produto — Desk Imperial

**Versão:** 1.0  
**Última atualização:** 2026-04-01

---

## O que é

O Desk Imperial é um sistema de gestão comercial gratuito, de código aberto, feito para pequenos e médios comerciantes brasileiros.

Ele nasceu para resolver um problema concreto: o pequeno comerciante não tem como pagar por um sistema de PDV profissional, então controla tudo em planilha — ou pior, de cabeça. Isso gera erros, perda de dinheiro e dificuldade de crescer.

O Desk Imperial oferece o que esses comerciantes precisam, sem mensalidade.

---

## Para quem é

### Perfil 1 — O dono do negócio

**Quem é:** dono de restaurante, lanchonete, bar, distribuidora ou qualquer comércio com atendimento presencial.

**O que ele precisa:**

- Saber quanto entrou e quanto saiu no dia
- Ver o que a equipe está fazendo em tempo real
- Saber quem vende mais e quem precisa melhorar
- Calcular salário e comissão sem fazer conta na mão
- Ter controle sem precisar estar no balcão o tempo todo

**O que o sistema entrega para ele:**

- Painel financeiro com receita, custo e margem por período
- PDV ao vivo com visão de todas as comandas abertas
- Ranking de vendedores e histórico por funcionário
- Folha de pagamento automática (salário fixo + comissão sobre vendas)
- Mapa de onde estão vindo os pedidos
- Acesso via celular com painel executivo mobile
- Admin PIN para proteger ações sensíveis

---

### Perfil 2 — O funcionário

**Quem é:** garçom, atendente, caixa — alguém que trabalha no balcão ou no salão.

**O que ele precisa:**

- Anotar pedido rápido sem complicação
- Ver o status do atendimento sem precisar perguntar para ninguém
- Acompanhar o que está pronto para entregar

**O que o sistema entrega para ele:**

- PDV mobile com lista de produtos e abertura de comanda
- Visão do kanban de atendimento em tempo real
- Interface simples, sem precisar de treinamento longo

---

### Perfil 3 — O desenvolvedor

**Quem é:** estudante, desenvolvedor júnior ou sênior interessado em contribuir, estudar ou usar como base.

**O que ele encontra aqui:**

- Monorepo NestJS + Next.js com arquitetura real de produção
- 16 módulos de domínio bem separados
- Padrões de segurança: CSRF, cookies HttpOnly, rate limit, isolamento de workspace
- 53+ testes cobrindo os módulos críticos
- CI completo com 6 estágios
- Código aberto com licença MIT

---

## Por que existe

O projeto nasceu a partir de uma necessidade real: um comércio familiar precisava de controle e não havia uma opção gratuita e acessível.

Quando o criador começou a pesquisar, percebeu que o problema era maior. Muitos pequenos comerciantes brasileiros não têm acesso a sistemas de gestão porque são caros, complicados ou os dois ao mesmo tempo.

A missão do Desk Imperial é simples: **tirar o comerciante brasileiro da planilha.**

Código aberto porque a transparência gera confiança. Gratuito porque é para quem precisa, não para quem pode pagar.

---

## O que o produto entrega hoje

### Funcional e rodando em produção

| Módulo                                | Status      |
| ------------------------------------- | ----------- |
| PDV / Comandas (kanban 4 colunas)     | ✅ Produção |
| Operação em tempo real (Socket.IO)    | ✅ Produção |
| Financeiro com KPIs por período       | ✅ Produção |
| Folha de pagamento automática         | ✅ Produção |
| Gestão de equipe e ranking            | ✅ Produção |
| Calendário comercial                  | ✅ Produção |
| Mapa de vendas por região             | ✅ Produção |
| Export CSV                            | ✅ Produção |
| Admin PIN com rate limit              | ✅ Produção |
| Mobile dono                           | ✅ Produção |
| Mobile funcionário                    | ✅ Produção |
| Autenticação segura (CSRF + HttpOnly) | ✅ Produção |
| Insight IA (Gemini)                   | ✅ Produção |
| LGPD / consentimento                  | ✅ Produção |

### Em evolução

| Módulo                             | Status                                            |
| ---------------------------------- | ------------------------------------------------- |
| Import CSV de produtos             | ⚠️ Desativado (lógica existe, endpoint bloqueado) |
| Monitoramento de erros em produção | ⚠️ Stack OSS em implantação progressiva           |
| Cobertura de testes frontend       | ⚠️ Parcial                                        |

---

## O que o produto não é

- **Não é um ERP completo.** O foco é o pequeno comerciante, não uma empresa com múltiplos departamentos.
- **Não é um aplicativo de entrega.** Não tem integração com iFood, Rappi ou similares.
- **Não tem plano pago.** É gratuito por decisão de produto, não por ser beta.
- **Não é um produto acabado.** Está em evolução ativa. Funciona, mas há funcionalidades em desenvolvimento.

---

## Acesso

- **Produção:** [app.deskimperial.online](https://app.deskimperial.online)
- **API:** [api.deskimperial.online](https://api.deskimperial.online/api/health)
- **Demo:** [docs/DEMO.md](../DEMO.md)

---

## Licença

MIT. Use, modifique e distribua livremente. Veja [LICENSE](../../LICENSE).
