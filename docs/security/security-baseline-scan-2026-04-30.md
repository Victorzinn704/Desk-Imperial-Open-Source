# Security Baseline Scan — 2026-04-30

## Escopo desta passada

Esta baseline cobriu duas frentes:

1. **qualidade e hotspots locais** com SonarQube
2. **superficie exposta real** com Nmap

Nao foi uma simulacao abstrata. Foi executado no host local e contra os endpoints publicados do Desk Imperial.

---

## Ambiente local validado

- Docker daemon local: **ativo**
- SonarQube local: **ativo e saudavel**
  - URL: `http://localhost:9000`
  - versao: `26.4.0.121862`
- Nmap no host Windows: **nao instalado de forma nativa**
- Fallback operacional adotado: **Nmap via Docker**

Arquivos brutos dos scans:

- [api edge quick](C:/Users/Desktop/Documents/desk-imperial/.cache/security/nmap/nmap-api-deskimperial-online-quick-20260430-195830.txt)
- [app edge quick](C:/Users/Desktop/Documents/desk-imperial/.cache/security/nmap/nmap-app-deskimperial-online-quick-20260430-195857.txt)
- [origin quick](C:/Users/Desktop/Documents/desk-imperial/.cache/security/nmap/nmap-163-176-171-242-quick-20260430-195808.txt)
- [origin top1000](C:/Users/Desktop/Documents/desk-imperial/.cache/security/nmap/nmap-163-176-171-242-top1000-20260430-195646.txt)

---

## Resultado do Nmap

### 1. Edge publicado via Cloudflare

Alvos:

- `api.deskimperial.online`
- `app.deskimperial.online`

Resultado:

- `80/tcp` aberto -> `Cloudflare http proxy`
- `443/tcp` aberto -> `Cloudflare http proxy`
- `22/tcp` filtrado
- `3000/tcp` filtrado
- `4000/tcp` filtrado
- `5432/tcp` filtrado
- `6379/tcp` filtrado
- `9000/tcp` filtrado

Leitura:

- a borda publicada esta coerente
- nao houve exposicao obvia de Redis/Postgres/porta de app na borda

### 2. Origem publica da producao

Alvo:

- `163.176.171.242`

Quick scan:

- `22/tcp` aberto -> `OpenSSH 8.9p1 Ubuntu`
- `80/tcp` aberto -> `nginx`
- `443/tcp` aberto -> `nginx`
- `3000/tcp` filtrado
- `4000/tcp` filtrado
- `5432/tcp` filtrado
- `6379/tcp` filtrado
- `9000/tcp` filtrado

Top 1000:

- apenas `22`, `80` e `443` abertos
- `997` portas filtradas

### Achados importantes

#### Achado A — bom

`5432` e `6379` nao aparecem abertos na origem.

Isso reduz bastante o risco classico de:

- Postgres exposto acidentalmente
- Redis exposto sem auth adequada

#### Achado B — esperado, mas precisa de decisao explicita

O **IP de origem responde diretamente em `80/443`** no nivel TCP com `nginx`.

Traducao:

- Cloudflare esta na frente
- mas a origem ainda e acessivel diretamente por IP

Isso nao e automaticamente erro.  
Mas precisa de decisao arquitetural consciente:

1. **se a estrategia for usar Cloudflare apenas como CDN/proxy publico**, esse estado pode ser aceitavel
2. **se a estrategia for usar Cloudflare como camada de protecao obrigatoria**, o ideal e restringir a origem para IPs da Cloudflare no firewall/reverse proxy

### Validacao da origem com allowlist e rollback

Depois da analise inicial, a origem foi endurecida em duas tentativas:

1. **allowlist no `nginx`** para ranges da Cloudflare
2. **allowlist no `ufw`** com rollback automatico

O teste operacional mostrou uma restricao importante da arquitetura atual:

- `app.deskimperial.online` e `api.deskimperial.online` **ainda recebem trafego direto na origem**
- requests reais chegaram ao `nginx` com IPs publicos de clientes/monitoria, por exemplo:
  - `186.193.49.134` (teste local)
  - `147.15.60.224` (Blackbox Exporter)
- ou seja, **a Cloudflare nao e hoje o unico caminho obrigatorio ate a origem**

Efeito observado:

- a allowlist no `nginx` devolveu **`403 Forbidden`** para trafego legitimo
- a allowlist no `ufw` foi aplicada com rollback e tambem exigiria precondicoes arquiteturais antes de ficar ativa

Acao tomada:

- **rollback do `ufw` executado com sucesso**
- **allowlist do `nginx` removida e origem restaurada**
- validacao final:
  - `https://app.deskimperial.online` -> **`200`**
  - `https://api.deskimperial.online/api/v1/health` -> **`200`**
  - `http://163.176.171.242` com `Host` de app -> **`301`**
  - `https://app.deskimperial.online` resolvendo direto para a origem -> **`200`**

### Decisao arquitetural desta passada

**A automacao de allowlist Cloudflare ficou pronta, mas a ativacao permanente depende de um pre-requisito: a origem precisa estar realmente atras da Cloudflare, ou os clientes legitimos extras precisam estar explicitamente allowlisted.**

Conclusao pratica:

- a defesa correta **nao** e ativar a regra cega agora
- primeiro precisamos decidir entre:
  1. tornar Cloudflare o unico caminho oficial para `app` e `api`
  2. ou manter origem direta e modelar allowlists extras para monitoria/admin/origens conhecidas

O script ficou preparado para isso com rollback e suporte a ranges extras.

#### Achado C — ponto de hardening

`22/tcp` esta aberto publicamente na origem.

Isso e comum e pode ser aceitavel, mas exige disciplina:

- chave SSH obrigatoria
- senha desabilitada
- `PermitRootLogin no`
- rate limit / fail2ban / equivalente
- allowlist por IP, se operacionalmente viavel

### Auditoria do SSH publico

Configuracao verificada na origem:

- `PasswordAuthentication no`
- `PermitRootLogin no`
- `PubkeyAuthentication yes`
- `KbdInteractiveAuthentication no`
- `AllowUsers ubuntu`
- `MaxAuthTries 3`
- `MaxSessions 4`
- `ClientAliveInterval 300`
- `ClientAliveCountMax 2`
- `X11Forwarding no`
- `PermitEmptyPasswords no`
- `AllowTcpForwarding local`

Controles operacionais verificados:

- `fail2ban` ativo para `sshd`
- `ufw limit 22/tcp` ativo

Decisao desta passada:

- **nao aplicar mudanca cega no SSH**
- o estado atual ja esta materialmente endurecido
- o proximo endurecimento util so faz sentido se vier com contexto operacional:
  - allowlist de IP administrativo
  - ou VPN/bastion obrigatorio para administracao

---

## Resultado do SonarQube local

Projeto:

- `desk-imperial`
- Quality Gate inicial: **PASSED**

Metricas principais:

- `bugs`: **2**
- `vulnerabilities`: **0**
- `security hotspots`: **3**
- `code smells`: **680**
- `coverage`: **49.4%**
- `duplicated_lines_density`: **1.8%**
- `ncloc`: **89490**
- `files`: **678**

### Baseline inicial

Metricas da primeira passada local:

- `bugs`: **2**
- `vulnerabilities`: **0**
- `security hotspots`: **3**
- `code smells`: **680**
- `coverage`: **49.4%**
- `duplicated_lines_density`: **1.8%**

### Bugs abertos na baseline inicial

1. [login-form.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/components/auth/login-form.tsx:293)
   - condicional retornando o mesmo valor
2. [pdv-wireframe-kitchen-helpers.ts](C:/Users/Desktop/Documents/desk-imperial/apps/web/components/dashboard/environments/pdv-wireframe-kitchen-helpers.ts:58)
   - ordenacao alfabetica sem `localeCompare`

### Blocker aberto na baseline inicial

1. [comanda.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/operations/comanda.service.ts:232)
   - funcao sempre retornando o mesmo valor

### Security hotspots pendentes na baseline inicial

1. [products-catalog.util.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/products/products-catalog.util.ts:113)
2. [barcode lookup route](C:/Users/Desktop/Documents/desk-imperial/apps/web/app/api/barcode/lookup/route.ts:268)
3. [qz-tray.client.ts](C:/Users/Desktop/Documents/desk-imperial/apps/web/lib/printing/qz-tray.client.ts:185)

Todos os tres eram hotspots de regex com risco de backtracking / DoS e estavam `TO_REVIEW`.

### Resultado final apos correcoes

Depois da refatoracao, nova cobertura e nova analise:

- `bugs`: **0**
- `vulnerabilities`: **0**
- `security hotspots`: **0**
- `code smells`: **632**
- `coverage`: **61.3%**
- `duplicated_lines_density`: **1.8%**
- Quality Gate atual: **ERROR**

Importante:

- o gate atual **nao** esta falhando por bug, vulnerabilidade ou hotspot
- ele esta falhando por:
  - `new_coverage = 65.8%` abaixo do threshold `80%`
  - `new_violations = 1` no ultimo scan completo antes do ultimo micro-ajuste de barcode

Correcoes validadas:

- blocker de [comanda.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/operations/comanda.service.ts:232) -> **fechado**
- hotspot de [products-catalog.util.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/products/products-catalog.util.ts:113) -> **zerado**
- hotspot de [barcode lookup route](C:/Users/Desktop/Documents/desk-imperial/apps/web/app/api/barcode/lookup/route.ts:268) -> **zerado**
- hotspot de [qz-tray.client.ts](C:/Users/Desktop/Documents/desk-imperial/apps/web/lib/printing/qz-tray.client.ts:185) -> **zerado**

Observacao importante:

- os smells **MAJOR/CRITICAL** em `telegram`, `operations` e `barcode` ficaram zerados
- a cobertura foi regenerada de forma real, nao reaproveitada de relatorio velho

---

## Observacoes tecnicas do scanner

### Sonar

O scan passou, mas com duas ressalvas reais:

1. `apps/web/app/globals.css` gerava warnings de highlight offset
2. os relatórios `lcov.info` tinham inconsistencias e caminhos antigos

### Estado desses ruídos apos a limpeza

- warnings de highlight em `apps/web/app/globals.css` -> **removidos**
- inconsistencias do `lcov.info` -> **removidas**
- normalizacao de cobertura adicionada aos scripts do repo

Isso nao invalida a baseline, mas significa que:

- a cobertura mostrada no Sonar precisa de limpeza posterior
- ha drift entre arquivos removidos/refatorados e o `lcov` atual

### Nmap

O wrapper local foi endurecido para:

- usar o binario local se existir
- fazer fallback automatico para `instrumentisto/nmap` via Docker se o host nao tiver Nmap
- evitar colisao de arquivos quando dois scans rodam no mesmo segundo

---

## Leitura de arquiteto / red team

### O que esta bom

1. borda publicada aparenta limpa
2. Redis e Postgres nao estao expostos
3. Sonar local ja esta funcional
4. nao houve vulnerabilidade aberta no Sonar nesta baseline

### O que merece acao agora

1. **levar o bloqueio de origem para firewall/UFW se quisermos fechar tambem o `80` em nivel de host**
2. **limpar os relatorios de cobertura usados pelo Sonar**
3. **corrigir os `679` code smells restantes por ondas**
4. **reduzir warnings de `globals.css` no scanner JS/CSS do Sonar**
5. **avaliar se o acesso SSH deve entrar em allowlist por IP operacional**

---

## Proximos passos recomendados

### Imediato

1. decidir se o proximo passo de origem e **UFW allowlist para Cloudflare** ou se o bloqueio no `nginx` ja atende a operacao
2. limpar `lcov` com caminhos mortos antes da proxima baseline
3. atacar smells severidade `CRITICAL/MAJOR` nos hotspots de `telegram`, `operations` e `barcode`

### Depois

1. rodar Nmap `top1000` apos qualquer mudanca de infra
2. considerar Snort apenas se quisermos IDS/IPS continuo na borda
3. considerar Wazuh quando quisermos correlacao central de host/log/evento

---

## Conclusao

Hoje, a leitura segura do projeto e esta:

- **o codigo melhorou bastante**
- **a exposicao basica do servidor esta sob controle**
- **o maior risco imediato nao e CVE gritante nem porta de banco aberta**
- os riscos desta passada foram tratados:
  - blocker de `comanda.service.ts` -> resolvido
  - regex hotspots -> resolvidos
  - bypass HTTPS direto da origem -> bloqueado no `nginx`
- o foco volta a ser **arquitetural e operacional**:
  - smells severos em `operations`, `telegram` e `barcode`
  - coverage drift do Sonar
  - decisao de endurecimento final da origem no firewall, se desejado
