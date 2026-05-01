# Workflow de Entrega Multi-Superficie

Data: 2026-04-21
Status: ativo

## Objetivo

Impedir que o Desk Imperial entre em caos ao evoluir desktop web, PWA, Android Kotlin e React Native ao mesmo tempo.

Este workflow define a ordem de trabalho, os gates e o que precisa estar pronto antes de uma feature atravessar superficies.

## Principio central

Toda feature nova atravessa as camadas nesta ordem:

1. dominio
2. contrato
3. backend
4. desktop web
5. owner PWA
6. Android Kotlin
7. React Native

Se uma feature pular essas etapas, o projeto cria duplicacao, divergencia de comportamento e retrabalho.

## Workflow oficial

### Etapa 0 — decisao curta

Antes de qualquer implementacao, registrar:

- problema que a feature resolve
- qual superficie e dona da feature
- se envolve hardware, fiscal, offline ou realtime
- se a feature e universal ou especifica de plataforma

### Etapa 1 — contrato e dominio

Obrigatorio antes de UI:

- definir payloads
- definir estados
- definir permissoes
- definir erro esperado
- definir efeitos de auditoria e realtime

Saida minima:

- update em contrato compartilhado
- nota curta em documentacao se a feature mudar fronteira de arquitetura

### Etapa 2 — backend

Obrigatorio antes de superfície final:

- endpoint ou evento pronto
- validacao de entrada
- regra de negocio consolidada
- auditoria e permissao aplicadas
- teste do fluxo critico

### Etapa 3 — desktop web

Primeira superficie de validacao completa.

A feature sobe no web primeiro quando:

- houver tela desktop equivalente
- a feature precisar de leitura mais densa
- a feature ainda estiver instavel

### Etapa 4 — Owner PWA

A feature sobe no Owner PWA quando:

- o comportamento estiver validado no backend
- o fluxo principal ja existir no web
- a experiencia mobile trouxer ganho operacional real

Se a feature for mobile-first por natureza, o layout pode nascer no PWA, mas a regra continua nascendo antes no backend/contrato.

### Etapa 5 — Android Kotlin

So entra quando houver pelo menos um destes criterios:

- hardware especifico
- necessidade de performance operacional acima do browser
- limitacao real do PWA
- integracao fiscal/local que o browser nao entrega

### Etapa 6 — React Native

So entra depois que a feature estiver madura em:

- contrato
- backend
- fluxo mobile
- fronteira de hardware

React Native nao e lugar para descobrir regra nova de negocio.

## Definition of Ready

Uma feature so entra em implementacao se responder:

1. em qual superficie ela nasce
2. em qual superficie ela e obrigatoria
3. em qual superficie ela e opcional
4. se depende de hardware
5. se depende de offline
6. se depende de realtime

## Definition of Done por camada

### Backend

- teste do fluxo critico passa
- contrato atualizado
- sem regra escondida em controller ou UI

### Desktop web

- rota abre
- usa dados reais ou fallback explicito
- sem `card dentro de card`
- light/dark consistente
- responsivo em desktop/tablet
- teste focado passa

### Owner PWA / Staff PWA

- navegacao movel estavel
- toques criticos sem scroll confuso
- realtime e reconexao funcionam
- offline nao gera corrompimento
- comportamento validado em Android real

### Android Kotlin

- integracao de hardware validada em dispositivo real
- estrategia de fila/offline validada
- logs e erro de dispositivo capturados

### React Native

- fluxo equivalente ao PWA/Android sem alterar semantica
- bridge nativa isolada quando precisar
- sem duplicar regra de negocio

## Politica de rollout

### Regra 1

Nenhuma feature sobe nas 4 superficies ao mesmo tempo.

### Regra 2

Subir primeiro na superficie dona do problema.

### Regra 3

So propagar para a proxima superficie depois de smoke e validacao minima da anterior.

## Politica de ownership

| Tipo de problema       | Superficie dona |
| ---------------------- | --------------- |
| Gestao densa           | desktop web     |
| Operacao movel do dono | owner PWA       |
| Execucao de equipe     | staff PWA       |
| Hardware Android       | Kotlin          |
| Expansao iPhone        | React Native    |

## Politica de hardware

Se uma feature envolver:

- impressora termica
- Bluetooth classico
- USB
- SAT fiscal
- NFC-e local

ela entra primeiro como item de arquitetura e nao como tela.

Pergunta obrigatoria:

"Isso realmente pertence ao browser?"

Se a resposta for nao ou "nao com confiabilidade", a feature vai para a trilha Android Kotlin.

## Pacotes e fronteiras recomendadas

### Compartilhado

- `packages/types`
- `packages/api-contract`
- futuro `packages/domain-sdk`

### Web/PWA

- `apps/web/app`
- `apps/web/components`

### Android

- futuro `apps/android`

### React Native

- futuro `apps/mobile`

## Checklist obrigatorio antes de abrir uma nova fase

1. documentacao da fase anterior atualizada
2. commit de baseline salvo
3. testes focados passando
4. typecheck passando
5. criterio de encerramento anterior cumprido

## O que e proibido

- abrir Kotlin antes de estabilizar a fronteira do PWA
- abrir React Native antes de estabilizar a fronteira do Android/PWA
- deixar cada superficie inventar seu proprio modelo de dados
- copiar UI desktop para mobile por compressao
- resolver limitacao de hardware no browser com gambiarra estrutural

## Sequencia operacional imediata

1. fechar o frontend desktop
2. abrir e estabilizar o Owner PWA
3. consolidar o cadastro rapido como fluxo mobile prioritario
4. definir a arquitetura do app Android dedicado
5. so depois abrir a trilha React Native
