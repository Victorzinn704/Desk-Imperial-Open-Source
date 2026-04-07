# Oracle Cloud + Neon — plano de runtime alvo

## Objetivo

Documentar com honestidade a próxima etapa de infraestrutura do Desk Imperial:

- sair da dependência de runtime gerenciado único no Railway
- manter o PostgreSQL no **Neon**
- preparar uma base própria para **app**, **API**, **Redis**, **observabilidade OSS** e **SonarQube**

---

## Estado real hoje

### Produção atual

- **Frontend e API:** Oracle Cloud `vm-free-01`
- **Banco relacional:** Neon PostgreSQL
- **Cache / rate limit / realtime horizontal:** Redis na `vm-free-01`
- **Observabilidade OSS:** stack persistente na `vm-free-02`
- **SonarQube:** serviço persistente na `vm-free-02`

### O que já existe no código

- compose local para banco e Redis em `infra/docker/docker-compose.yml`
- compose local de observabilidade em `infra/docker/docker-compose.observability.yml`
- trilha OTel → Alloy → Prometheus → Grafana documentada em `docs/operations/observability-oss-phase1.md`
- workflow de SonarQube pronto em `.github/workflows/sonarqube.yml`

---

## Decisão arquitetural

### O que fica fora da Oracle agora

- **Neon PostgreSQL** continua como banco principal

Motivo:

- reduz complexidade de migração
- evita mover a camada mais sensível ao mesmo tempo que app e observabilidade
- preserva uma base já funcional para produção

### O que passa a ser alvo da Oracle

- `apps/web`
- `apps/api`
- `Redis`
- `Grafana`
- `Prometheus`
- `Alloy`
- `Alertmanager`
- `SonarQube`

---

## Topologia alvo inicial

### Fase 1 — VM única enxuta

Usar uma VM Oracle Linux / Ampere como host inicial para:

- reverse proxy
- frontend
- API
- Redis

Essa fase prioriza:

- sair do risco de expiração do Railway
- manter a aplicação viva
- preparar um ponto estável para o bootstrap remoto com Docker

### Fase 2 — observabilidade e governança

Na `vm-free-02`, subir:

- Grafana
- Prometheus
- Alloy
- Alertmanager
- SonarQube

Essa camada fica separada da produção para não competir com `web`, `api`, `redis` e `nginx` por CPU/I/O durante build, scan e retenção de métricas.

---

## Artefatos executáveis já materializados

A base mínima e honesta de runtime para Oracle/VM agora fica materializada nestes arquivos:

- `infra/oracle/compose.yaml`
- `infra/oracle/Caddyfile`
- `infra/oracle/docker/api.Dockerfile`
- `infra/oracle/docker/web.Dockerfile`
- `infra/oracle/.env.example`
- `infra/oracle/README.md`
- `infra/scripts/oracle-bootstrap.sh`

Esses artefatos cobrem a fase 1 documentada aqui:

- `web`
- `api`
- `Redis`
- reverse proxy

A camada operacional da fase 2 fica materializada em:

- `infra/oracle/ops/compose.yaml`
- `infra/oracle/ops/prometheus/prometheus.yml`
- `infra/oracle/ops/prometheus/alert.rules.yml`
- `infra/oracle/ops/README.md`
- `infra/scripts/oracle-ops-tunnel.ps1`

---

## O que continua DADO AUSENTE

O plano continua dependente de itens que ainda não estão materializados neste repositório:

- IAM / secret manager externo
- backup e DR
- receiver externo real para o Alertmanager (`ALERTMANAGER_WEBHOOK_URL`)

---

## Serviços e responsabilidade

| Serviço        | Função                                          | Observação                   |
| -------------- | ----------------------------------------------- | ---------------------------- |
| `proxy`        | reverse proxy HTTP da VM Oracle                 | expõe `web` e `api` na borda |
| `web`          | Next.js do Desk Imperial                        | exposto por proxy            |
| `api`          | NestJS + Socket.IO                              | exposto por proxy            |
| `redis`        | cache, rate limit e base do realtime horizontal | interno                      |
| `grafana`      | visualização operacional                        | `127.0.0.1` na `vm-free-02`  |
| `prometheus`   | métricas e alert rules                          | `127.0.0.1` na `vm-free-02`  |
| `alloy`        | recepção OTLP e roteamento                      | OTLP no IP privado da VCN    |
| `alertmanager` | entrega de alertas                              | `127.0.0.1` na `vm-free-02`  |
| `sonarqube`    | auditoria estática contínua                     | `127.0.0.1` na `vm-free-02`  |

---

## Ordem madura de rollout

### Etapa 1 — bootstrap da VM

- instalar Docker
- instalar Git
- instalar Node apenas se necessário para manutenção local
- instalar tmux
- preparar diretório do projeto

### Etapa 2 — aplicação primeiro

- subir `web`, `api` e `redis`
- apontar API para o Neon
- validar:
  - login
  - health
  - realtime
  - PWA básico

### Etapa 3 — observabilidade

- subir `alloy`, `prometheus`, `grafana` e `alertmanager`
- apontar API para o endpoint OTLP remoto
- validar métricas `desk_finance_*` e `desk_operations_*`

### Etapa 4 — SonarQube

- subir serviço persistente do SonarQube
- configurar `SONAR_HOST_URL` e `SONAR_TOKEN` nos GitHubs
- transformar a auditoria local já existente em trilha contínua de ambiente

---

## Riscos reais

### 1. Misturar tudo cedo demais

Subir app + observabilidade + SonarQube na mesma primeira passada aumenta ruído e dificulta diagnóstico.

**Mitigação:** migrar a aplicação primeiro, depois camadas auxiliares.

### 2. Realtime parecer “lento” por código, não por máquina

Uma VM melhor ajuda o Socket.IO, mas não substitui:

- payload menor
- cache correto
- menos refetch desnecessário
- Redis saudável

**Mitigação:** medir o comportamento do realtime já no novo host.

### 3. Exposição indevida de painéis

Grafana, Prometheus e SonarQube não devem nascer públicos sem autenticação e regra clara.

**Mitigação:** proxy com acesso controlado e portas internas por padrão.

---

## Critério de pronto

Considerar a fase Oracle “aceitável” quando:

- app e API responderem com estabilidade
- Socket.IO reconectar e propagar eventos corretamente
- Redis estiver ativo para cache e realtime
- health check reportar `dbHealthy` e `redisHealthy`
- Grafana receber métricas reais da API
- SonarQube estiver acessível e pronto para CI
- Prometheus tiver targets `up` para app, API, observabilidade, SonarQube e node exporters das VMs Oracle

---

## Próximo passo recomendado

1. configurar `ALERTMANAGER_WEBHOOK_URL` com um receiver real
2. cadastrar `SONAR_HOST_URL` e `SONAR_TOKEN` nos repositórios GitHub
3. evoluir dashboards de negócio separados para financeiro, operações e browser
4. formalizar backup/DR da camada operacional
