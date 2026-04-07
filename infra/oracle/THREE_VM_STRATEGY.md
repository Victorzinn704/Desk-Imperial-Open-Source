# Estratégia Oracle — 3 VMs

Este documento registra a separação operacional adotada para manter o Desk Imperial leve, seguro e mais previsível na Oracle.

## Distribuição

| VM                | Papel       | Responsabilidade                                                                                                            |
| ----------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `vm-free-01`      | Produção    | `nginx`, `web`, `api`, `redis`, `certbot` e `node-exporter` preso ao loopback                                               |
| `vm-free-02`      | Ops/Builder | build das imagens Docker, registry privado, Grafana, Prometheus, Loki, Tempo, Alloy, Alertmanager, Blackbox, SonarQube e DB |
| `vm-amd-micro-01` | Sentinela   | healthcheck externo e tarefas pequenas de bastion/ops                                                                       |

## Decisão

- A produção não deve ser usada como máquina principal de build.
- A `vm-free-02` deve absorver build e validação para reduzir CPU, I/O e risco operacional na `vm-free-01`.
- A `vm-free-02` também concentra observabilidade e SonarQube porque tem memória suficiente, enquanto mantém as UIs presas em `127.0.0.1`.
- A AMD micro tem pouca memória; por isso não deve rodar aplicação, observabilidade pesada, SonarQube ou build.

## Camada de operações

A stack operacional da `vm-free-02` fica em:

- `/opt/desk-ops` na VM
- `infra/oracle/ops` no repositório

Serviços:

- Grafana: `127.0.0.1:3001`
- Prometheus: `127.0.0.1:9090`
- Alertmanager: `127.0.0.1:9093`
- SonarQube: `127.0.0.1:9000`
- Loki: `127.0.0.1:3100`
- Tempo: `127.0.0.1:3200`
- Alloy UI: `127.0.0.1:12345`
- Alloy OTLP HTTP privado: `10.10.1.166:4318`
- Alloy OTLP gRPC privado: `10.10.1.166:4317`

O acesso humano deve usar túnel SSH:

```powershell
.\infra\scripts\oracle-ops-tunnel.ps1
```

O Prometheus coleta métricas de host de duas formas:

- `vm-free-02`: `node-exporter` como serviço do compose
- `vm-free-01`: `node-exporter` em `127.0.0.1:9100` acessado por proxy SSH interno `prod-node-exporter-proxy:19100`

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

## Próxima melhoria recomendada

O fluxo atual já tira build da produção, elimina o `docker save/load` pela máquina local e usa BuildKit quando ele está disponível. A próxima evolução é habilitar cache persistente do Next.js/Turbopack para reduzir o tempo quando a camada de código do `web` muda:

```bash
NEXT_CACHE_DIR=...
```
