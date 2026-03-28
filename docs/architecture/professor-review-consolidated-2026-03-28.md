# Consolidação da Avaliação Externa - 2026-03-28

## Objetivo

Consolidar os 3 documentos de avaliação externa em uma leitura única, pragmática e atualizada do Desk Imperial:

- `auditoria-de-melhorias.md`
- `code-review-detalhado.md`
- `sprints-correcao-desk-imperial.md`

Esta consolidação separa:

- o que é `confirmado e prioritário`
- o que é `válido, mas não urgente`
- o que está `desatualizado`
- o que está `superestimado ou mal priorizado`

---

## Leitura Geral

Os documentos trazem boas intenções e vários pontos úteis, mas misturam:

1. achados reais
2. pontos já corrigidos internamente
3. hipóteses não validadas no código atual
4. recomendações genéricas com cara de “boas práticas”, mas sem o melhor custo-benefício para o momento do projeto

Conclusão executiva:

- a avaliação externa é útil como insumo
- ela não deve ser tratada como backlog literal
- o Desk Imperial já está em estado mais maduro do que os relatórios sugerem em alguns pontos

---

## Matriz de Confiabilidade

| Tema                                 | Status         | Leitura                                              |
| ------------------------------------ | -------------- | ---------------------------------------------------- |
| `finance.service` muito grande       | Confirmado     | Ganho arquitetural real e imediato                   |
| Falta de E2E                         | Confirmado     | Importante para release pública                      |
| Poucos testes de frontend            | Confirmado     | Gap real                                             |
| CSP com `unsafe-inline`              | Parcial        | Hardening válido, mas não blocker atual              |
| Rate limiting global                 | Confirmado     | Defesa em profundidade útil                          |
| Middleware SSR para `/app`           | Parcial        | Pode melhorar UX/redirect, não é segurança principal |
| Duplicação CPF/CNPJ frontend/backend | Parcial        | Existe, mas não é prioridade agora                   |
| `packages/validation`                | Parcial        | Boa direção futura, não prioridade imediata          |
| Logs commitados                      | Desatualizado  | Não se confirmou como problema atual do repositório  |
| `.env` commitado                     | Desatualizado  | Não se confirmou no Git atual                        |
| `finance` sem testes                 | Desatualizado  | Já não reflete o estado atual                        |
| Baseline de `337` testes             | Desatualizado  | Backend validado em `391` testes                     |
| “41 bugs críticos”                   | Superestimado  | Severidade inflada                                   |
| Timing attack em CSRF por tamanho    | Superestimado  | Baixo impacto prático agora                          |
| Microserviços cedo                   | Mal priorizado | Não recomendado neste estágio                        |

---

## Confirmado e Prioritário

### 1. Refinamento estrutural do módulo financeiro

Status: `confirmado`

Por que importa:

- o módulo financeiro concentra muita regra e agregação
- isso pesa em manutenção, review e evolução
- já existe histórico de complexidade alta nessa área

Decisão:

- continuar o fatiamento interno do `finance.service`
- manter o monólito modular
- evitar transformar isso em package novo antes de estabilizar as fronteiras internas

Direção correta:

- analytics helpers
- breakdown builders
- timeline/channel/customer/region aggregations
- service focado em orquestração, cache e composição

### 2. Testes E2E de fluxos críticos

Status: `confirmado`

Prioridade real:

- cadastro/login
- operações críticas do salão/PDV
- fechamento de comanda
- visão executiva mínima

Observação:

- isso vale mais agora do que criar dezenas de microajustes de performance teórica

### 3. Testes de frontend

Status: `confirmado`

Gap real:

- frontend ainda está muito menos coberto que o backend
- isso pesa especialmente em shells operacionais, hooks e formulários críticos

Prioridade sugerida:

- login/cadastro
- `owner-mobile-shell`
- `staff-mobile-shell`
- componentes de histórico/comanda
- hooks de realtime/optimistic updates

### 4. Rate limiting global

Status: `confirmado`

Leitura:

- auth já tinha proteção específica
- Cloudflare já protege na borda
- rate limit global na API é defesa em profundidade útil

Observação:

- isso é melhoria sólida de plataforma
- não substitui observabilidade e hardening de endpoint específico

---

## Válido, Mas Não Urgente

### 5. CSP mais forte

Status: `parcial`

Leitura:

- o ponto é tecnicamente válido
- mas a proteção atual já está apoiada em múltiplas camadas
- o custo de endurecer CSP com nonce pode ser maior que o ganho imediato

Decisão:

- manter como backlog de hardening
- não tratar como impeditivo de entrega

### 6. Middleware SSR nas rotas privadas

Status: `parcial`

Leitura:

- melhora UX
- evita flicker e redireciona cedo
- mas não resolve segurança de verdade sozinho

Decisão:

- pode entrar como refinamento de navegação
- não deve ser confundido com camada principal de autenticação

### 7. Duplicação de validação CPF/CNPJ

Status: `parcial`

Leitura:

- existe repetição entre frontend e backend
- isso pode virar package compartilhado depois
- agora não é o maior ganho do projeto

Decisão:

- só mover quando a regra estiver estável e a repetição começar a doer de verdade

### 8. `packages/validation`

Status: `parcial`

Leitura:

- é uma boa direção futura
- mas criar package cedo demais pode espalhar refactor desnecessário

Decisão:

- avaliar depois de estabilizar:
  - auth
  - operations/realtime
  - finance
  - formulários críticos do frontend

---

## Desatualizado

### 9. Baseline antiga de testes

Status: `desatualizado`

O que os documentos dizem:

- `337` testes

Estado mais atual validado:

- `391` testes backend passando

Impacto:

- relatórios antigos subestimam o estágio atual da suíte

### 10. `finance.service` sem cobertura

Status: `desatualizado`

Estado atual:

- `finance.service.spec.ts` já existe
- a suíte cobre:
  - cache
  - crescimento
  - conversão de moeda
  - agregações executivas

### 11. Logs commitados

Status: `desatualizado`

Checagem já feita:

- havia logs locais
- não se confirmou problema atual de versionamento
- a higiene local já foi tratada

### 12. `.env` commitado

Status: `desatualizado`

Checagem já feita:

- o arquivo local existe
- não apareceu como versionado no histórico atual do repositório

Observação:

- continua sendo importante manter `.env.example` como referência
- mas o alerta do relatório não reflete o estado atual do Git

---

## Superestimado ou Mal Priorizado

### 13. “41 bugs críticos”

Status: `superestimado`

Leitura:

- há pontos relevantes no code review
- mas a severidade foi inflada
- vários itens são melhorias, não falhas críticas reais de produção

Risco dessa leitura:

- gerar sensação de projeto mais quebrado do que ele realmente está
- empurrar o time para correções cosméticas ou teóricas

### 14. Timing attack no tamanho do CSRF

Status: `superestimado`

Leitura:

- tecnicamente discutível
- impacto real muito baixo frente a gaps maiores

Decisão:

- não tratar como P0

### 15. OTP de 6 dígitos como “crítico”

Status: `superestimado`

Leitura:

- depende do contexto completo:
  - TTL
  - lockout
  - rate limiting
  - canal de entrega

Decisão:

- pode melhorar
- não deve deslocar prioridades mais concretas

### 16. Microserviços / split precoce

Status: `mal priorizado`

Leitura:

- o Desk Imperial ganha mais com monólito modular bem lapidado
- extrair cedo demais criaria custo operacional desnecessário

Decisão:

- manter como monólito modular
- fortalecer contratos internos
- só reavaliar split com dor real de escala/deploy/ownership

---

## O Que Aproveitar do Plano de Sprints

O documento de sprints é útil como estrutura, mas precisa poda.

Itens que valem reaproveitar:

- E2E dos fluxos críticos
- rate limiting global/distribuído onde houver dor real
- melhoria de observabilidade
- refinamento de frontend em áreas com custo de render real
- acessibilidade nos fluxos principais

Itens que precisam reavaliação antes de executar:

- middleware SSR tratado como segurança principal
- pacotes novos de validação antes da hora
- memoização genérica em massa no frontend
- várias tasks classificadas como blocker sem evidência prática equivalente

---

## Backlog Executivo Recomendado

### Prioridade 1

- continuar o saneamento estrutural de `finance`
- consolidar documentação de baseline de testes
- subir testes E2E mínimos dos fluxos críticos
- expandir testes do frontend nas áreas operacionais

### Prioridade 2

- observabilidade e correlação de erros
- hardening de endpoints expostos
- revisar acessibilidade dos fluxos principais
- refinar pontos de render pesado com medição real

### Prioridade 3

- CSP mais forte
- possível middleware de navegação protegida
- consolidação gradual de validações compartilhadas
- eventual `packages/validation`, se a repetição justificar

---

## Veredito Final

Os documentos do professor são valiosos como provocação técnica e como inspeção ampla, mas não devem ser executados literalmente.

Leitura final:

- `auditoria-de-melhorias.md` é o melhor insumo macro
- `code-review-detalhado.md` é útil como lista de hipóteses, não como verdade fechada
- `sprints-correcao-desk-imperial.md` precisa ser podado antes de virar backlog real

Decisão recomendada para o Desk Imperial:

- usar esses materiais como radar
- validar cada item contra o estado atual do código
- priorizar o que traz ganho estrutural real
- rejeitar backlog inflado por severidade artificial

Em resumo:

- a avaliação externa foi útil
- mas o projeto está mais maduro do que ela sugere em vários pontos
- o melhor caminho agora é execução cirúrgica, não reação ansiosa
