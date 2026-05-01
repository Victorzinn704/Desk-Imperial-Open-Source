# Project Closure Workflow — 2026-04-30

## Objetivo

Fechar o Desk Imperial em ordem de risco e retorno.

Isso aqui nao e roadmap de marketing.  
E um fluxo de execucao para reduzir regressao, melhorar manutencao e tirar o projeto do modo “cresceu sem freio”.

## Estado base de hoje

### Central de qualidade

- `lint:repo` -> `0 errors`, `1750 warnings`
- `lint:sast` -> `0 findings`
- `lint:cycles` -> `0 circular deps`
- `audit:deps` -> `0 vulnerabilities`
- `lint:dead` -> ainda aponta **20 arquivos mortos**
- `SonarQube local` -> **subiu e gerou baseline real**
- cobertura Sonar regenerada sem drift de `lcov`
- `globals.css` sem warnings de highlight offset no scan final

### Decisao de execucao

A partir daqui, o projeto fecha por **trilhos paralelos com gates claros**:

1. **Data protection**
2. **Quality center**
3. **Infra security testing**
4. **Realtime / performance**
5. **Print / QZ / print node**
6. **Telegram**
7. **Intelligence platform / LangChain / RAG**
8. **Android Kotlin / APK**

Nao inverter essa ordem sem motivo forte.

## Gate zero — congelamento operacional

Antes de qualquer bloco maior:

1. manter deploy funcional em Oracle
2. manter testes criticos passando
3. manter `lint:sast`, `lint:cycles`, `audit:deps` verdes
4. manter snapshot externo do legado removido

## Trilha 1 — Data protection

### Meta

Reduzir exposicao de dados em repouso e melhorar o transporte interno.

### Entradas

- [crypto-hardening-plan-2026-04-30.md](C:/Users/Desktop/Documents/desk-imperial/docs/architecture/crypto-hardening-plan-2026-04-30.md:1)
- [data-protection-matrix-2026-04-30.md](C:/Users/Desktop/Documents/desk-imperial/docs/architecture/data-protection-matrix-2026-04-30.md:1)

### Ordem

1. migrar `TelegramLinkToken.token` para hash-only
2. implementar blind index para:
   - `Comanda.customerDocument`
   - `Order.buyerDocument`
3. criptografar `notes` sensiveis:
   - `CashSession.notes`
   - `CashMovement.note`
   - `CashClosure.notes`
   - `Comanda.notes`
   - `ComandaItem.notes`
   - `ComandaPayment.note`
   - `Order.notes`
4. criptografar trilha sensivel:
   - `Session.ipAddress`, `userAgent`
   - `PasswordResetToken.ipAddress`, `userAgent`
   - `OneTimeCode.ipAddress`, `userAgent`
   - `UserConsent.ipAddress`, `userAgent`
   - `AuditLog.ipAddress`, `userAgent`
5. revisar TLS de `DATABASE_URL`, `DIRECT_URL` e `REDIS_URL`

### Gate de saida

1. nenhum token efemero armazenado em claro
2. campos de documento com blind index
3. notas livres sensiveis fora de claro
4. plano de rotacao de chave aprovado

## Trilha 2 — Quality center

### Meta

Transformar warning em backlog priorizado e matar o lixo restante.

### Ordem

1. remover os **20 arquivos mortos** restantes
2. remover exports/tipos mortos restantes
3. rodar SonarQube assim que o Docker local estiver disponivel
4. consolidar baseline:
   - top arquivos por `max-lines`
   - top funcoes por `complexity`
   - top componentes por `react-perf`

### Gate de saida

1. `lint:dead` sem arquivos mortos reais
2. Sonar rodando com baseline registrada
3. warning map convertido em fila por dominio

## Trilha 3 — Infra security testing

### Meta

Parar de depender so de analise de codigo e validar a superficie real publicada do sistema.

### Entradas

- [security-testing-workflow-2026-04-30.md](C:/Users/Desktop/Documents/desk-imperial/docs/security/security-testing-workflow-2026-04-30.md:1)
- [security.md](C:/Users/Desktop/Documents/desk-imperial/docs/architecture/security.md:1)

### Ordem

1. subir o Docker daemon local e registrar baseline do SonarQube
2. rodar Nmap quick contra os endpoints publicados
3. aprovar a lista de portas e servicos esperados
4. provar se `app/api` chegam a origem via Cloudflare ou direto
5. so entao ativar allowlist de Cloudflare no host/proxy
6. rodar `top1000` apos mudancas relevantes de proxy, firewall ou compose
7. decidir Snort apenas se precisarmos de IDS/IPS continuo na borda
8. decidir Wazuh apenas quando a operacao justificar SIEM/XDR de verdade

### Gate de saida

1. Sonar local rodando no host
2. Nmap com baseline registrada
3. superficie exposta documentada e aprovada
4. nenhuma porta critica exposta por engano
5. qualquer allowlist de origem testada com rollback e precondicao arquitetural valida

## Trilha 4 — Realtime / performance

### Meta

Resolver o gargalo real que hoje mata PDV, cozinha e mobile.

### Ordem

1. quebrar `comanda.service.ts` por fatias seguras
2. medir patching vs invalidate pesado no PDV
3. auditar `operations-realtime` e socket auth
4. medir:
   - tempo de abrir comanda
   - tempo de refletir item no salao/cozinha
   - reconexao e cold start
5. reduzir rerender no mobile/staff shell

### Gate de saida

1. comanda abre com latencia curta e previsivel
2. cozinha recebe item quase em tempo real
3. mobile nao sofre avalanche de rerender
4. hotspot `comanda.service.ts` sai do estado atual de arquivo monolitico

## Trilha 5 — Print / QZ / print node

### Meta

Parar de depender do browser como centro da impressao.

### Ordem

1. estabilizar QZ desktop enquanto o produto roda
2. fechar `print-devices` + `print-jobs`
3. subir `apps/print-agent`
4. serial COM e fila Windows por transporte
5. fallback e auditoria de job

### Gate de saida

1. imprimir do celular nao depende de host manual no browser
2. cada loja tem seu node de impressao
3. jobs sao auditaveis e reprocessaveis

## Trilha 6 — Telegram

### Meta

Fechar o bot como canal empresarial de verdade.

### Ordem

1. terminar UI de integracao e smoke real fora do demo
2. migrar token de link para hash
3. feature flag por workspace
4. outbound first:
   - alertas
   - relatorios
   - caixa
5. inbound command bot estavel

### Gate de saida

1. linking seguro e auditado
2. demo travado do jeito certo
3. bot oficial como unica fonte da verdade

## Trilha 7 — Intelligence platform / LangChain / RAG

### Meta

Subir a camada inteligente sem contaminar o dominio.

### Ordem

1. terminar `notifications` e `intelligence-platform` boundaries
2. tools fechadas por contrato
3. memoria/cache controlados
4. RAG so depois que as fontes e permissao estiverem claras

### Gate de saida

1. nada de LLM com acesso livre a dominio
2. tools versionadas
3. custo e observabilidade sob controle

## Trilha 8 — Android Kotlin / APK

### Meta

Transformar o PWA em cliente nativo onde o browser ja virou gargalo.

### Ordem

1. fechar backend/realtime/print antes
2. definir boundary do app Android:
   - camera
   - bluetooth
   - telegram push/hand-off
   - treinamento e coleta local
3. montar shell Kotlin
4. integrar auth, sync e offline queue

### Gate de saida

1. app nao vira reimplementacao caotica do web
2. sensores e bluetooth passam a ser vantagem real do nativo

## Fila executiva recomendada

### Agora

1. `TelegramLinkToken.token` -> hash-only
2. remover 20 arquivos mortos restantes
3. ligar Sonar assim que Docker local voltar
4. rodar Nmap quick e registrar baseline de exposicao
5. abrir fila de refactor de `comanda.service.ts`

### Depois

1. criptografia de campos sensiveis
2. realtime/performance
3. print node
4. Telegram completo
5. intelligence layer
6. Android Kotlin

## Regra de governo

Cada frente so avanca se:

1. build passa
2. testes criticos passam
3. `lint:sast` continua verde
4. `audit:deps` continua em zero
5. o corte nao piora o warning map sem justificativa documentada
