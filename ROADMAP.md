# Roadmap — Desk Imperial

**Última atualização:** 2026-04-01  
**Mantido por:** João Victor de Moraes da Cruz

Este documento mostra o estado real do projeto e o que está planejado.
Não é uma promessa de prazo — é um livro de atualizações honesto.

---

## Estado atual

O Desk Imperial está em **versão beta funcional**. Está rodando em produção em [app.deskimperial.online](https://app.deskimperial.online), com usuários reais e dados reais.

Os módulos principais estão completos e estáveis. Há débitos técnicos conhecidos e funcionalidades em evolução — todos documentados em [docs/product/risks-and-limitations.md](./docs/product/risks-and-limitations.md).

---

## O que está pronto

### Core operacional

- [x] PDV com kanban 4 colunas e arrastar e soltar
- [x] Abertura de comanda com CPF/CNPJ validado
- [x] Desconto e acréscimo por comanda
- [x] Atualização em tempo real via Socket.IO
- [x] Histórico de comandas fechadas

### Gestão do negócio

- [x] Financeiro com KPIs por período (dia, semana, mês)
- [x] Top produtos e top vendedores
- [x] Folha de pagamento automática (salário fixo + comissão)
- [x] Ranking de vendedores
- [x] Calendário comercial com arrastar e soltar
- [x] Mapa de vendas por região e bairro
- [x] Export CSV de pedidos

### Segurança e infraestrutura

- [x] Autenticação com cookies HttpOnly + CSRF duplo
- [x] Rate limit por domínio em Redis
- [x] Admin PIN com bloqueio anti-força-bruta
- [x] Isolamento de workspace (multi-tenant)
- [x] Audit log de eventos críticos
- [x] CI com 6 estágios (quality, backend, frontend, e2e, security, build)
- [x] 53+ testes no backend

### Integrações

- [x] Brevo (e-mail transacional)
- [x] Gemini AI (insight executivo)
- [x] AwesomeAPI (cotações de moeda)
- [x] Nominatim / OpenStreetMap (geocodificação)
- [x] ViaCEP (consulta de CEP)

### Mobile

- [x] Painel executivo mobile para dono
- [x] PDV mobile para funcionário

### Conformidade

- [x] LGPD — consentimento de cookies
- [x] Versionamento de documentos legais

---

## Em andamento

### Documentação

- [x] README reescrito
- [x] CONTRIBUTING.md
- [x] SECURITY.md
- [x] Índice de documentação (docs/INDEX.md)
- [x] Documentação de produto (overview, requirements, user-flows, risks)
- [x] Documentação de arquitetura (modules, database, realtime)
- [ ] docs/DEMO.md — instruções de acesso à conta demo
- [ ] Screenshots do produto

### Qualidade

- [ ] Ampliar cobertura de testes E2E no frontend
- [ ] Testes de integração para fluxo de calendário

---

## Planejado

Sem prazo definido. Ordem não é prioridade — depende de demanda real dos usuários.

### Alta prioridade

| Item                       | Descrição                                                     |
| -------------------------- | ------------------------------------------------------------- |
| **Monitoramento de erros** | Integração com Sentry — erros em produção hoje são invisíveis |
| **Import CSV de produtos** | Endpoint estava bloqueado — reativar com validação robusta    |
| **Notificações push**      | Alertas para o dono quando caixa fecha, meta atingida, etc.   |

### Média prioridade

| Item                         | Descrição                                                      |
| ---------------------------- | -------------------------------------------------------------- |
| **Relatórios customizáveis** | Permitir que o dono crie recortes financeiros específicos      |
| **Histórico de preços**      | Rastrear variações de preço dos produtos ao longo do tempo     |
| **Múltiplos caixas**         | Suporte a mais de um operador de caixa simultâneo              |
| **Impressão térmica**        | Finalizar integração com impressoras térmicas (base já existe) |
| **Performance budget no CI** | Alertar quando o bundle size crescer além do limite            |

### Baixa prioridade / exploração

| Item                        | Descrição                                                               |
| --------------------------- | ----------------------------------------------------------------------- |
| **Integração com delivery** | iFood, Rappi — fora do escopo atual, mas pesquisado                     |
| **Múltiplas unidades**      | Mesmo CNPJ, filiais diferentes — demanda arquitetura de multi-workspace |
| **App nativo**              | React Native ou PWA completo — atualmente é web responsiva              |
| **Relatório em PDF**        | Exportar relatório mensal em PDF formatado                              |

---

## O que foi descartado

| Item                                | Motivo                                            |
| ----------------------------------- | ------------------------------------------------- |
| **Sistema de reservas**             | Fora do perfil do público-alvo atual              |
| **Chat interno entre funcionários** | Complexidade alta, baixo valor para o comerciante |
| **Marketplace de produtos**         | Foge da missão do produto                         |

---

## Como contribuir com o roadmap

Tem uma ideia ou viu algo que faz falta?

1. Abra uma [issue](https://github.com/Victorzinn704/nextjs-boilerplate/issues) descrevendo o problema que você quer resolver
2. Descreva para qual tipo de usuário isso seria útil (dono, funcionário, desenvolvedor)
3. Discutimos antes de qualquer implementação

Leia [CONTRIBUTING.md](./CONTRIBUTING.md) para o fluxo completo.
