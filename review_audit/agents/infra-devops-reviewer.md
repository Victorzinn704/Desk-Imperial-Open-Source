# Auditoria Infra / DevOps

**Escopo:** `infra/`, `.github/`, Dockerfiles, compose, scripts operacionais e envs  
**Data:** 2026-04-10  
**Status:** evidence-first, sem alteração de código de produção

## Resumo do Domínio

A camada de infra/ops está bem segmentada entre `infra/docker` (ambiente local), `infra/oracle` (runtime e observabilidade na Oracle) e `.github/workflows` (CI, segurança e SonarQube). Há bons controles já implantados: health checks em serviços críticos, probes com Blackbox, alertas no Prometheus, TLS/HSTS no Nginx e gates de qualidade no CI.

O problema central não é ausência de automação, e sim excesso de confiança em segredos locais, SSH sem verificação forte de host, rollback acoplado a migração de banco e ausência explícita de backup/DR formal. Em outras palavras: o sistema detecta falhas, mas ainda é frágil para reverter e recuperar falhas.

## Principais Riscos

- Segredos reais estão armazenados em texto puro no workspace e em documentação operacional.
- Automação de deploy e túnel SSH desabilita verificação de host, reduzindo a confiança na origem do alvo.
- Rollback é fraco porque o start da API executa `prisma migrate deploy` e o deploy faz `force-recreate` antes da validação final.
- Backup/DR está explicitamente marcado como ausente para a base Oracle.
- Há defaults inseguros em compose local/observability e um stack operacional pesado concentrado em uma VM sem limites de recursos explícitos.

## Achados Detalhados

### 1) Segredos operacionais em texto puro no workspace

- **Severidade:** Alta
- **Confiança:** Alta
- **Natureza:** Fato confirmado + inferência forte
- **Fato confirmado:** o `.env` raiz contém valores reais de operação, incluindo `DATABASE_URL`, `DIRECT_URL`, `COOKIE_SECRET`, `CSRF_SECRET`, `BREVO_API_KEY`, `GRAFANA_ADMIN_PASSWORD`, `SONARQUBE_ADMIN_PASSWORD` e `SONARQUBE_CI_TOKEN`. Evidência: [`.env`](C:\Users\Desktop\Documents\desk-imperial\.env):11-13, 28, 46-49.
- **Fato confirmado:** `infra/oracle/ops/README.md` manda manter credenciais em texto puro em `/opt/desk-ops/credentials.txt` e na cópia local ignorada pelo Git em `.secrets/ops-credentials.txt`. Evidência: [`infra/oracle/ops/README.md`](C:\Users\Desktop\Documents\desk-imperial\infra\oracle\ops\README.md):19, 95.
- **Hipótese:** o arquivo local está mesmo fora do Git, então o risco de vazamento para o repositório é menor. `git check-ignore` confirma que `.env` e `.secrets/` estão ignorados, mas isso não reduz o risco de exposição local ou por backup/sincronização da máquina.
- **Impacto:** qualquer comprometimento da estação/VM que contenha esses arquivos expõe credenciais de produção, observabilidade e integrações externas.
- **Recomendação concreta:** mover segredos para um secret manager, apagar cópias plaintext, rotacionar tudo que já foi listado e deixar nos arquivos só chaves placeholders.

### 2) Deploy e túnel SSH sem verificação forte de host

- **Severidade:** Alta
- **Confiança:** Alta
- **Natureza:** Fato confirmado
- **Fato confirmado:** `infra/scripts/oracle-builder-deploy.ps1` executa `ssh` e `scp` com `StrictHostKeyChecking=no` em múltiplos pontos. Evidência: [`infra/scripts/oracle-builder-deploy.ps1`](C:\Users\Desktop\Documents\desk-imperial\infra\scripts\oracle-builder-deploy.ps1):25, 71, 177, 189, 198, 229-233.
- **Fato confirmado:** `infra/scripts/oracle-ops-tunnel.ps1` também usa `StrictHostKeyChecking=no`. Evidência: [`infra/scripts/oracle-ops-tunnel.ps1`](C:\Users\Desktop\Documents\desk-imperial\infra\scripts\oracle-ops-tunnel.ps1):15-24.
- **Impacto:** um host falso, MITM ou redirecionamento indevido pode ser aceito sem alerta. Isso enfraquece tanto o deploy quanto o acesso operacional aos painéis.
- **Recomendação concreta:** ativar `StrictHostKeyChecking=yes`, registrar fingerprints em `known_hosts`, usar `ProxyJump`/bastion quando necessário e separar chave de deploy da chave de acesso operacional.

### 3) Rollback fraco porque a migração roda no boot e o deploy força recriação

- **Severidade:** Alta
- **Confiança:** Alta
- **Natureza:** Fato confirmado + inferência forte
- **Fato confirmado:** o start da API Railway executa `prisma migrate deploy` antes de subir o processo principal. Evidência: [`infra/scripts/railway-start.sh`](C:\Users\Desktop\Documents\desk-imperial\infra\scripts\railway-start.sh):12-18.
- **Fato confirmado:** a imagem da API Oracle faz a mesma coisa no `CMD`. Evidência: [`infra/oracle/docker/api.Dockerfile`](C:\Users\Desktop\Documents\desk-imperial\infra\oracle\docker\api.Dockerfile):69.
- **Fato confirmado:** o deploy Oracle usa `docker compose up -d --no-build --force-recreate` e só então aguarda health. Evidência: [`infra/scripts/oracle-builder-deploy.ps1`](C:\Users\Desktop\Documents\desk-imperial\infra\scripts\oracle-builder-deploy.ps1):264-278.
- **Fato confirmado:** `railway.json` está configurado com `restartPolicyType: ON_FAILURE`, não com rollback. Evidência: [`railway.json`](C:\Users\Desktop\Documents\desk-imperial\railway.json):7-12.
- **Inferência forte:** um migration quebrado ou incompatível pode bloquear o boot e manter o ciclo de restart em falha; a versão anterior não é preservada automaticamente como fallback ativo.
- **Impacto:** tempo maior de indisponibilidade, rollback manual mais lento e maior risco de travar uma release por mudança de schema.
- **Recomendação concreta:** separar migração de banco do boot da aplicação, promover release só depois de health aprovado, manter a versão anterior ativa até o corte final e documentar um rollback executável por imagem/tag.

### 4) Backup e DR estão explicitamente ausentes

- **Severidade:** Alta
- **Confiança:** Alta
- **Natureza:** Fato confirmado
- **Fato confirmado:** `infra/oracle/README.md` diz explicitamente que `backup e DR` estão em “DADO AUSENTE”. Evidência: [`infra/oracle/README.md`](C:\Users\Desktop\Documents\desk-imperial\infra\oracle\README.md):29-35.
- **Fato confirmado:** a estratégia Oracle reforça que backup/DR ainda não foi formalizado. Evidência: [`infra/oracle/THREE_VM_STRATEGY.md`](C:\Users\Desktop\Documents\desk-imperial\infra\oracle\THREE_VM_STRATEGY.md):15-18.
- **Risco potencial:** os compose files usam volumes locais e armazenamento local para parte da stack, mas não há job/rotina de backup ou restore testado no material de infra revisado.
- **Impacto:** perda de dados, aumento de RTO e dependência total do provedor/volume corrente para recuperação.
- **Recomendação concreta:** definir RPO/RTO, automatizar backup/snapshot do banco principal, testar restore periodicamente e documentar runbook de recuperação para a base Oracle e para os volumes da camada operacional.

### 5) Defaults inseguros em compose local e observability

- **Severidade:** Média
- **Confiança:** Alta
- **Natureza:** Fato confirmado
- **Fato confirmado:** o Redis local aceita senha padrão `change_me_in_prod` quando `REDIS_PASSWORD` não está definido. Evidência: [`infra/docker/docker-compose.yml`](C:\Users\Desktop\Documents\desk-imperial\infra\docker\docker-compose.yml):21-31.
- **Fato confirmado:** o Grafana do compose de observability sobe com `desk_observability_change_me` se `GRAFANA_ADMIN_PASSWORD` não vier do ambiente. Evidência: [`infra/docker/docker-compose.observability.yml`](C:\Users\Desktop\Documents\desk-imperial\infra\docker\docker-compose.observability.yml):87-93.
- **Impacto:** quem subir a stack sem `.env` pode expor serviços com credenciais conhecidas, especialmente em host compartilhado ou laboratório acessível por rede.
- **Recomendação concreta:** falhar fechado sem senha explícita, ou gerar credenciais efêmeras no primeiro boot de dev; não usar fallback conhecido em runtime.

## Observações Complementares

- **Custo e confiabilidade:** a `vm-free-02` concentra Grafana, Prometheus, Loki, Tempo, Alloy, Alertmanager, Blackbox, SonarQube e o Postgres do Sonar. Isso está documentado em [`infra/oracle/THREE_VM_STRATEGY.md`](C:\Users\Desktop\Documents\desk-imperial\infra\oracle\THREE_VM_STRATEGY.md):10-18 e materializado em [`infra/oracle/ops/compose.yaml`](C:\Users\Desktop\Documents\desk-imperial\infra\oracle\ops\compose.yaml):54-187. Não há limites explícitos de CPU/memória no compose, então o risco de OOM e de custo operacional por crescimento de retenção/ingestão é um `risco potencial`, não um fato já observado.
- **Supply chain / reprodutibilidade:** o runtime Oracle usa `certbot/certbot:latest` em [`infra/oracle/compose.yaml`](C:\Users\Desktop\Documents\desk-imperial\infra\oracle\compose.yaml):114-121. Não é o achado mais grave, mas um tag flutuante reduz previsibilidade de deploy e pode quebrar renovação de certificado sem mudança no repositório.

## Conclusão

O repositório já tem boa base de observabilidade e health checking, mas ainda falha nos fundamentos de operação segura: segredos locais, confiança SSH, rollback e recuperação. O maior ganho imediato vem de quatro frentes: tirar segredos plaintext do workspace, endurecer SSH, separar migração de boot e formalizar backup/restore com teste real.
