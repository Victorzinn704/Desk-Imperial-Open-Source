# Plano Mestre de Documentação — Desk Imperial

**Versão:** 1.1  
**Data:** 2026-05-01  
**Autor:** João Victor de Moraes da Cruz  
**Status:** Histórico de planejamento

---

## Objetivo

Transformar a documentação do Desk Imperial em referência de projeto open source sério —
acessível para comerciante, útil para desenvolvedor, confiável para recrutador, honesta para a comunidade.

Nenhum documento inventa funcionalidade. Tudo é baseado no repositório real.

## Leitura correta deste arquivo

Este documento registra a intencao editorial original da trilha de documentacao.

Ele **nao** e a fonte canonica do estado atual do projeto.

Hoje, as referencias prioritarias sao:

1. `../README.md`
2. `./README.md`
3. `./INDEX.md`
4. docs canonicos em `architecture/`, `product/`, `operations/`, `security/` e `testing/`

---

## Princípios desta documentação

1. **Verdade antes de tudo** — documentar o que existe, admitir o que falta
2. **Acessível sem perder profundidade** — linguagem simples onde o usuário lê, técnica onde o dev precisa
3. **Navegável** — cada documento tem propósito único, índice centralizado, sem repetição
4. **Segura** — nada que exponha credenciais, vetores de ataque ou comportamentos internos críticos
5. **Viva** — documentação que acompanha o produto, não um snapshot abandonado

---

## Mapa de documentação

### Raiz do repositório

| Arquivo           | Status       | Propósito                                                              |
| ----------------- | ------------ | ---------------------------------------------------------------------- |
| `README.md`       | ✅ Reescrito | Porta de entrada do projeto — identidade, quick start, funcionalidades |
| `CONTRIBUTING.md` | ✅ Criado    | Como contribuir, fluxo de PR, checklist                                |
| `SECURITY.md`     | ✅ Criado    | Política de segurança, como reportar vulnerabilidades                  |
| `ROADMAP.md`      | ✅ Criado    | O que está feito, o que está em andamento, o que vem a seguir          |
| `LICENSE`         | Existe       | MIT — não alterar                                                      |

### docs/ — Produto

| Arquivo                                 | Status    | Propósito                                            |
| --------------------------------------- | --------- | ---------------------------------------------------- |
| `docs/INDEX.md`                         | ✅ Criado | Índice navegável de toda a documentação              |
| `docs/product/overview.md`              | ✅ Criado | O que é o produto, para quem é, por que existe       |
| `docs/product/requirements.md`          | ✅ Criado | Requisitos funcionais e não-funcionais documentados  |
| `docs/product/user-flows.md`            | ✅ Criado | Fluxos principais do usuário (dono e funcionário)    |
| `docs/product/risks-and-limitations.md` | ✅ Criado | Riscos conhecidos, limitações atuais, débito técnico |

### docs/ — Arquitetura

| Arquivo                                    | Status    | Propósito                                             |
| ------------------------------------------ | --------- | ----------------------------------------------------- |
| `docs/architecture/overview.md`            | Existe    | Visão geral da arquitetura — revisar                  |
| `docs/architecture/modules.md`             | ✅ Criado | Responsabilidade dos módulos de domínio ativos |
| `docs/architecture/database.md`            | ✅ Criado | Schema completo documentado por entidade              |
| `docs/architecture/realtime.md`            | ✅ Criado | Fluxo Socket.IO — namespace, eventos, ciclo de vida   |
| `docs/architecture/authentication-flow.md` | Existe    | Fluxo de autenticação — não alterar                   |
| `docs/architecture/local-development.md`   | Existe    | Setup local — não alterar                             |

### docs/ — Segurança

| Arquivo                                   | Status | Propósito                        |
| ----------------------------------------- | ------ | -------------------------------- |
| `docs/security/security-baseline.md`      | Existe | Baseline de segurança do projeto |
| `docs/security/admin-pin-hardening.md`    | Existe | Hardening do Admin PIN           |
| `docs/security/deploy-checklist.md`       | Existe | Checklist de deploy seguro       |
| `docs/security/observability-and-logs.md` | Existe | Observabilidade e logs           |

### docs/ — Pessoal / Comunidade

| Arquivo                   | Status  | Propósito                        |
| ------------------------- | ------- | -------------------------------- |
| `docs/CREATOR.md`         | Existe  | Relato pessoal do criador        |
| `docs/GETTING-STARTED.md` | Existe  | Dicas para novos desenvolvedores |
| `docs/DEMO.md`            | A criar | Como acessar a conta demo        |

---

## O que NÃO documentar (por segurança)

- Chaves, tokens ou segredos — apenas `.env.example` com placeholders
- Detalhes de implementação de rate limiting que possam ajudar ataques de bypass
- Informações sobre infraestrutura de produção (IPs, serviços internos)
- Vulnerabilidades conhecidas não corrigidas — essas vão para `SECURITY.md` via canais privados

---

## Critérios de qualidade

Cada documento precisa passar por:

- [ ] Baseado em evidência do repositório (não inventado)
- [ ] Linguagem clara para o público-alvo daquele doc
- [ ] Sem repetição desnecessária com outros documentos
- [ ] Link de navegação no INDEX.md
- [ ] Sem exposição de informação sensível

---

## Revisão futura

Este plano deve ser atualizado quando:

- Novo módulo é adicionado
- Comportamento de um módulo existente muda significativamente
- Uma limitação conhecida é resolvida
- Nova integração é adicionada

Quando a governanca editorial driftar de novo, atualizar primeiro `docs/README.md` e `docs/INDEX.md`, nao este plano historico.
