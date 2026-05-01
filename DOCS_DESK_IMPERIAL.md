# DESK IMPERIAL - DOCUMENTACAO PUBLICA CONSOLIDADA

Versao: 6.0  
Data de consolidacao: 2026-05-01  
Escopo: repositorio aberto + estado operacional documentado do projeto

---

## 1. Objetivo deste documento

Este arquivo organiza a leitura da documentacao publica do Desk Imperial e deixa claro o que e:

1. fonte canonica
2. documento historico
3. runbook publico de rollout
4. material que continua privado por motivo operacional ou de seguranca

---

## 2. Regra de leitura do repositorio aberto

O Desk Imperial hoje evolui em waves.

Isso significa que:

- o **mirror aberto** recebe syncs incrementais
- a **documentacao publica** pode refletir trilhas mais novas antes do sync completo de toda a arvore de codigo
- artefatos com segredo, IP privado, host real, topologia interna ou detalhe sensivel de hardening **nao devem ser espelhados sem sanitizacao**

Nao trate ausencia imediata de um modulo no mirror aberto como prova de que a trilha nao existe no projeto principal. Confira sempre o estado descrito em `README.md`, `docs/README.md` e `docs/INDEX.md`.

---

## 3. Fontes canonicas publicas

Para entendimento tecnico e de produto, considerar como fonte primaria:

1. `README.md`
2. `docs/README.md`
3. `docs/INDEX.md`
4. `docs/product/*`
5. `docs/architecture/*`
6. `docs/operations/telegram-bot-rollout.md`
7. `docs/operations/sentry-rollout-2026-05-01.md`
8. `docs/security/security-testing-workflow-2026-04-30.md`
9. `docs/waves/realtime-*.md`

---

## 4. O que mudou nesta consolidacao

Esta passada trouxe a documentacao publica para um estado mais honesto sobre:

- rollout do bot Telegram
- rollout de Sentry em web e API
- estrategia de testes de seguranca
- trilha de recovery do realtime
- regra explicita de sync por waves entre monorepo principal e mirror aberto

Tambem removeu uma ambiguidade antiga: documentacao publica nao deve mais fingir que todo artefato operacional sensivel cabe no GitHub aberto.

---

## 5. Trilhas documentadas agora

### Produto

- proposta do Desk Imperial
- perfis de usuario
- limitacoes conhecidas

### Arquitetura

- modulos e dominios principais
- banco de dados
- tempo real
- autenticacao e sessao
- setup local

### Operacoes

- rollout do bot Telegram
- rollout de Sentry com DSN, release e sourcemaps
- observabilidade OSS e trilhas de refinamento realtime

### Seguranca

- baseline publica
- workflow de testes de seguranca
- checklist de deploy seguro

### Waves

- inventario Wave 0 do realtime
- plano de recovery
- checklist de validacao

---

## 6. O que fica fora do mirror publico

Por regra, nao devem entrar aqui sem sanitizacao:

- tokens, secrets e chaves
- IPs privados, bastions, hosts internos e detalhes de acesso
- hardening operacional com impacto direto em superficie de ataque
- runbooks que dependem de topologia real da infraestrutura
- arquivos de auditoria com caminhos absolutos locais

Quando uma trilha precisar ser documentada publicamente, a versao aberta deve ser resumida, sanitizada e orientada por comportamento, nao por segredo operacional.

---

## 7. Definicao de pronto para documentacao publica

Uma atualizacao documental no GitHub aberto so esta pronta quando:

1. esta alinhada ao estado atual conhecido do projeto
2. explicita limites entre mirror aberto e monorepo principal
3. nao expoe segredos ou topologia sensivel
4. preserva um caminho claro para onboarding tecnico
5. nao contradiz o README nem o indice central de docs
