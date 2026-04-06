# Oracle Cloud + Neon — plano de runtime alvo

## Objetivo

Documentar com honestidade a próxima etapa de infraestrutura do Desk Imperial:

- sair da dependência de runtime gerenciado único no Railway
- manter o PostgreSQL no **Neon**
- preparar uma base própria para **app**, **API**, **Redis**, **observabilidade OSS** e **SonarQube**

---

## Estado real hoje

### Produção atual

- **Frontend e API:** Railway
- **Banco relacional:** Neon PostgreSQL
- **Cache / rate limit / realtime horizontal:** Redis
- **Observabilidade OSS:** base pronta no repositório, rollout ainda parcial entre ambientes
- **SonarQube:** baseline oficial validado localmente, ainda não consolidado como serviço persistente de ambiente

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

Na mesma VM inicial ou em separação posterior, subir:

- Grafana
- Prometheus
- Alloy
- Alertmanager
- SonarQube

Essa camada deve entrar **depois** da aplicação estar estável, para não misturar migração de runtime com rollout de monitoramento.

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

---

## O que continua DADO AUSENTE

O plano continua dependente de itens que ainda não estão materializados neste repositório:

- DNS/domínio final
- TLS/certificado
- IP público ou hostname estável
- IAM / secret manager externo
- backup e DR
- observabilidade fase 2
- SonarQube como serviço persistente da Oracle

---

## Serviços e responsabilidade

| Serviço        | Função                                          | Observação                      |
| -------------- | ----------------------------------------------- | ------------------------------- |
| `proxy`        | reverse proxy HTTP da VM Oracle                 | expõe `web` e `api` na borda    |
| `web`          | Next.js do Desk Imperial                        | exposto por proxy               |
| `api`          | NestJS + Socket.IO                              | exposto por proxy               |
| `redis`        | cache, rate limit e base do realtime horizontal | interno                         |
| `grafana`      | visualização operacional                        | expor com autenticação          |
| `prometheus`   | métricas e alert rules                          | preferencialmente interno       |
| `alloy`        | recepção OTLP e roteamento                      | interno ou parcialmente exposto |
| `alertmanager` | entrega de alertas                              | interno                         |
| `sonarqube`    | auditoria estática contínua                     | acesso controlado               |

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

---

## Próximo passo recomendado

1. concluir o bootstrap da VM Oracle
2. acessar por SSH
3. preparar Docker + repositório
4. subir primeiro `web + api + redis`
5. só depois acoplar observabilidade e SonarQube
