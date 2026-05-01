# Estratégia Oracle — 5 VMs

Este documento registra a separação operacional adotada para manter o Desk Imperial previsível, barato e sem depender do Neon.

## Distribuição

| VM                        | Papel            | Responsabilidade                                                                                                             |
| ------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `vm-free-01`              | Produção         | `nginx`, `web`, `api`, `redis`, `certbot` e runtime público                                                                  |
| `vm-free-02`              | Ops/Builder/BI   | build das imagens Docker, registry privado, Grafana, Prometheus, Loki, Tempo, Alloy, Alertmanager, Blackbox, SonarQube e Metabase |
| `vm-amd-micro-01`         | Sentinela        | healthcheck externo, bastion e tarefas pequenas de ops                                                                      |
| `lohana-ampere-01`        | Banco            | `PostgreSQL 17`, `PgBouncer`, `pgBackRest`, `postgres_exporter`, `node-exporter`                                            |
| `lohana-amd-micro-01`     | Runner           | restore drill, `pgBadger`, jobs leves de backup/checagem                                                                    |

## Decisão

- A produção não deve ser usada como máquina principal de build nem como host do banco.
- A `vm-free-02` absorve build, observabilidade e Metabase para não disputar RAM com o banco.
- A Ampere da Lohana é dedicada ao dado e não hospeda app, Grafana ou SonarQube.
- A AMD micro da Lohana não deve rodar banco primário nem BI; ela existe para restore drill e jobs leves.
- O runner AMD também usa WireGuard e não expõe serviço algum ao público.
- Como a conta da Lohana é separada, a rede entre as VMs deve ser privada por WireGuard.

## Camada de operações

A stack operacional da `vm-free-02` fica em:

- `/opt/desk-ops` na VM
- `infra/oracle/ops` no repositório

Serviços:

- Grafana: `127.0.0.1:3001`
- Metabase: `127.0.0.1:3002`
- Prometheus: `127.0.0.1:9090`
- Alertmanager: `127.0.0.1:9093`
- SonarQube: `127.0.0.1:9000`
- Loki: `127.0.0.1:3100`
- Tempo: `127.0.0.1:3200`
- Alloy UI: `127.0.0.1:12345`
- Alloy OTLP HTTP privado: `<OPS_PRIVATE_IP>:4318`
- Alloy OTLP gRPC privado: `<OPS_PRIVATE_IP>:4317`

O acesso humano deve usar túnel SSH:

```powershell
.\infra\scripts\oracle-ops-tunnel.ps1
```

O Prometheus coleta métricas de host de três formas:

- `vm-free-02`: `node-exporter` como serviço do compose
- `vm-free-01`: `node-exporter` em `127.0.0.1:9100` acessado por proxy SSH interno `prod-node-exporter-proxy:19100`
- `lohana-ampere-01`: `node-exporter` e `postgres_exporter` por IP privado WireGuard via `file_sd`

## Fluxo de deploy rápido

Use o script:

```powershell
.\infra\scripts\oracle-builder-deploy.ps1 -Service all
```

Opções:

```powershell
.\infra\scripts\oracle-builder-deploy.ps1 -Service web
.\infra\scripts\oracle-builder-deploy.ps1 -Service api
```

O script:

1. empacota o working tree local com `git ls-files`;
2. envia a fonte para a `vm-free-02`;
3. builda as imagens na builder com BuildKit/buildx quando disponível;
4. publica as imagens no registry local da builder;
5. abre um túnel SSH temporário da produção para o registry;
6. faz `docker pull` pela rede privada/túnel, sem expor o registry publicamente;
7. recria apenas `api` e/ou `web` com `--no-build`;
8. valida `app` e `api` publicamente.

O fallback antigo por pacote de imagem continua disponível:

```powershell
.\infra\scripts\oracle-builder-deploy.ps1 -Service all -Transport archive
```

## Registry privado

- O registry roda na `vm-free-02` como `desk-registry`.
- Ele escuta apenas em `127.0.0.1:5000` dentro da builder.
- A produção acessa o registry por túnel SSH local em `127.0.0.1:55000`.
- A chave do túnel fica na produção em `~/.ssh/desk_registry_tunnel_ed25519`.
- O registry não deve ser exposto em `0.0.0.0`, nem no IP público da VM.
- O script encerra túneis antigos presos nessa porta antes de abrir um novo.

## Tempo observado

- Primeiro `web` com Dockerfile novo e cache frio: ~9min48s.
- `web` com cache quente: ~20s.
- Primeiro `api` com Dockerfile novo e cache frio: ~10min16s.
- `api` com cache quente: ~19s.
- `api + web` com mudança de fonte real: ~1min37s.
- `api + web` com cache quente: ~24s.

## Fronteiras de responsabilidade

- `vm-free-01` não deve conter banco.
- `vm-free-02` não deve conter OLTP do produto.
- a Ampere da Lohana não deve conter Metabase, Grafana ou SonarQube.
- o runner AMD da Lohana não deve conter tráfego crítico do produto.
