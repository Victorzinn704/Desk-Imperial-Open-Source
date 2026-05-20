# Estrategia Multi-Superficie

Data: 2026-04-21
Status: ativo

## Objetivo

Definir a estrategia oficial do Desk Imperial para evoluir em cinco superficies sem perder governanca:

- desktop web
- owner PWA
- staff PWA
- app Android dedicado em Kotlin
- app iPhone posterior via React Native

O objetivo nao e "ter app em todo lugar". O objetivo e manter uma unica regra de negocio, um unico contrato de dados e uma divisao clara de responsabilidades por superficie.

## Decisoes travadas

- O backend continua sendo a fonte de verdade de regra de negocio.
- O desktop web continua sendo a superficie mais completa de gestao.
- O PWA vira a superficie principal de operacao movel.
- O app Android dedicado em Kotlin entra para capacidades que o PWA nao entrega com confiabilidade suficiente.
- O app React Native entra depois, priorizando iPhone e reaproveitamento de fluxo, nao de UI web.
- Nenhuma superficie implementa regra de negocio propria se essa regra puder viver no backend ou em contratos compartilhados.

## Papel de cada superficie

| Superficie     | Papel oficial                                                 | Deve conter                                                                                                             | Nao deve conter                                                                            |
| -------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Desktop web    | centro de gestao                                              | configuracao completa, financeiro denso, operacao consolidada, IA, relatorios, equipe, catalogo                         | hacks de hardware local como se fosse app nativo                                           |
| Owner PWA      | centro operacional movel                                      | hoje, comandas, PDV, financeiro resumido, cadastro rapido, conta                                                        | BI desktop comprimido, telas gigantes, configuracao confusa                                |
| Staff PWA      | execucao operacional                                          | mesas, pedido, cozinha, historico proprio, vendas proprias, ranking do turno em contexto de equipe, reconexao e offline | financeiro global, vendas de outros por detalhe sensivel, settings densos, fluxo executivo |
| Android Kotlin | camada dedicada de hardware e operacao critica                | impressora, bluetooth classico, USB, fiscal, scan de alta frequencia, fluxos offline mais fortes                        | duplicar o desktop inteiro                                                                 |
| React Native   | camada movel secundaria para iPhone e expansao cross-platform | fluxos moveis ja estabilizados, consumo de contratos e navegacao unificada                                              | experimentar regras novas antes de estabilizar no backend                                  |

## Boundary ja aplicado no Staff PWA

- `Comandas` mostra comandas ativas do salao, nao apenas as proprias.
- `Cozinha` mostra a fila compartilhada do salao, nao apenas os itens do proprio funcionario.
- `Mesas` mostra o mapa compartilhado do salao, nao apenas as mesas do proprio funcionario.
- Em `Comandas`, o staff pode:
  - retomar atendimento
  - adicionar item
  - avancar status
  - adiantar fechamento/pagamento
- Em `Cozinha`, o staff precisa ver:
  - mesa
  - responsavel principal
  - pressao da fila
  - proxima acao operacional
- Em `Mesas`, o staff precisa ver:
  - quais mesas estao livres
  - quais mesas estao em uso
  - quem e o responsavel principal
  - quais mesas dele ja estao sob responsabilidade
- `Pedido` sempre nasce do contexto de mesa/comanda; nao existe catalogo solto sem contexto operacional.
- Quando o `Pedido` estiver em modo de adicionar itens, ele deve manter o responsavel principal visivel para evitar ambiguidade no atendimento.
- Cada comanda aberta deve exibir o responsavel principal para evitar ambiguidade na operacao.
- O strip de leitura do staff em `Comandas` trabalha so com:
  - ativas
  - em preparo
  - prontas
- `Historico` mostra apenas comandas encerradas atribuidas ao funcionario atual.
- `Receita realizada`, `receita esperada` e demais KPIs do staff sempre usam o recorte proprio.
- `Ranking do turno` pode existir, mas apenas como contexto de equipe:
  - posicao atual
  - distancia para o lider
  - leitura resumida do proprio desempenho
- O staff nao enxerga extrato detalhado de vendas de outros operadores dentro do shell movel.

## Fonte de verdade por camada

| Camada                        | Fonte de verdade                           |
| ----------------------------- | ------------------------------------------ |
| Regra de negocio              | `apps/api`                                 |
| Contratos HTTP e schema       | `packages/types` + `packages/api-contract` |
| Estado remoto e sincronizacao | TanStack Query + realtime por workspace    |
| Persistencia relacional       | Prisma + PostgreSQL                        |
| Cache/rate limit              | Redis                                      |
| Tema e tokens web/PWA         | `apps/web`                                 |
| Hardware Android              | app Kotlin + adapters dedicados            |

## Regras nao negociaveis

1. Nenhuma regra de desconto, cancelamento, fechamento, auditoria ou permissao nasce na UI.
2. Nenhuma superficie cria payload paralelo fora do contrato compartilhado sem RFC curta.
3. Todo fluxo novo precisa ser descrito primeiro por dominio e depois por superficie.
4. PWA e apps nativos podem divergir em UI, mas nao em semantica operacional.
5. Recursos de hardware nao podem contaminar a arquitetura do desktop web.
6. O Android dedicado implementa o que o browser nao entrega com confiabilidade, nao o que "seria legal" ter nativo.

## Ordem oficial de evolucao

1. Backend e contratos
2. Desktop web
3. Owner PWA
4. Android Kotlin
5. React Native

Essa ordem existe para reduzir retrabalho. Se uma regra muda no passo 1, as superficies de cima reaproveitam. Se a regra nasce no passo 4, o sistema vira excecao permanente.

## Estrutura-alvo de compartilhamento

### Ja existente

- `apps/api`
- `apps/web`
- `packages/types`
- `packages/api-contract`

### Alvo recomendado para as proximas fases

```text
apps/
  api/
  web/
  android/            # futuro app Kotlin
  mobile/             # futuro app React Native
packages/
  types/              # contratos Zod-first
  api-contract/       # OpenAPI gerado
  domain-sdk/         # futuro: formatters, mappers, view models puros
  design-tokens/      # futuro: tokens compartilhados entre web e mobile
```

## Politica de hardware

### PWA

Serve bem para:

- operacao movel
- scan por camera
- realtime
- offline parcial
- instalacao em tela inicial
- push web

Nao deve ser tratado como garantia para:

- Bluetooth classico de impressora termica
- USB em matriz ampla de dispositivos
- integracao fiscal nativa

### Android Kotlin

E a superficie alvo para:

- impressora termica
- Bluetooth classico
- USB
- SAT fiscal / NFC-e local quando aplicavel
- modos offline mais agressivos
- servicos locais e integracoes especificas de equipamento

### React Native

Entra depois com foco em:

- iPhone
- reaproveitamento de fluxo e estado
- navegacao movel madura

Se houver necessidade de hardware pesado no iPhone, isso deve ser tratado com modulo nativo proprio, nao com improviso no core React Native.

## Fronteira entre web/PWA e app dedicado

| Capability                           | PWA         | Kotlin   | React Native          |
| ------------------------------------ | ----------- | -------- | --------------------- |
| Comandas ao vivo                     | sim         | sim      | sim                   |
| PDV movel                            | sim         | sim      | sim                   |
| Historico de comandas                | sim         | sim      | sim                   |
| Cadastro rapido via camera           | sim         | sim      | sim                   |
| Impressao termica Bluetooth classico | nao assumir | sim      | depois, via bridge    |
| USB                                  | nao assumir | sim      | depois, via bridge    |
| Fiscal local                         | nao assumir | sim      | depois, se necessario |
| Painel executivo completo            | nao         | opcional | nao                   |

## Referencias de estudo fixadas

### Arquitetura e monorepo

- `cal.com`
- `dub`
- `documenso`
- `plane`
- `twenty`
- `formbricks`
- `chatwoot`
- `medusa`
- `odoo` POS

### UI/UX mobile

- iFood
- Ze Delivery
- Nubank
- Itau
- WhatsApp
- Mobbin
- UI Sources

### Bibliotecas-alvo

- Vaul
- Sonner
- `@serwist/next`
- Dexie
- TanStack Query persist
- Embla Carousel
- React Aria Components

## Anti-padroes proibidos

- replicar o desktop inteiro no PWA
- manter a mesma tela em PWA, Kotlin e React Native sem um dono claro
- colocar logica fiscal na camada web
- empurrar regra operacional para UI so porque "e mais rapido"
- criar um shell movel gigante com dezenas de `if/else`
- abrir iOS antes de o Android dedicado estabilizar a fronteira de hardware

## Criterio de sucesso

Esta estrategia so se considera cumprida quando:

1. web, PWA e apps dedicados tiverem fronteiras claras
2. regras de negocio estiverem centralizadas
3. hardware estiver isolado na camada certa
4. o time conseguir dizer, para qualquer feature nova, em qual superficie ela nasce e por que
