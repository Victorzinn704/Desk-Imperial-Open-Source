# AI Sandbox no test1

Este projeto pode ser aberto em um container isolado para agentes trabalharem apenas dentro do repositório, sem montar o restante dos seus arquivos pessoais.

## O que foi configurado

- `infra/docker/Dockerfile.sandbox`: imagem base do workspace isolado.
- `infra/docker/docker-compose.sandbox.yml`: sobe o ambiente com bind mount apenas do repositório.
- `infra/docker/docker-compose.sandbox.offline.yml`: override para rodar sem rede.
- `.devcontainer/devcontainer.json`: abre o projeto direto no container via VS Code.
- `.devcontainer/entrypoint.sh`: inicializa `HOME`, cache, tmp e carrega `.env.container`.

## Propriedades de isolamento

- Usuario nao-root no container.
- `cap_drop: [ALL]` e `no-new-privileges`.
- Root filesystem somente leitura.
- `tmpfs` para temporarios.
- Volumes separados para `HOME`, cache e `node_modules`.
- So o repositorio `test1` e montado em `/workspace`.

## Comandos

Subir:

```bash
docker compose -f infra/docker/docker-compose.sandbox.yml up -d --build
```

Entrar:

```bash
docker compose -f infra/docker/docker-compose.sandbox.yml exec sandbox bash
```

Desligar:

```bash
docker compose -f infra/docker/docker-compose.sandbox.yml down
```

Modo offline:

```bash
docker compose -f infra/docker/docker-compose.sandbox.yml -f infra/docker/docker-compose.sandbox.offline.yml up -d --build
```

## Importante

- O sandbox protege o resto da maquina por nao montar outras pastas, mas nao apaga risco de rede se voce subir o modo normal.
- O arquivo `.env` do projeto continua dentro do repositorio. Se ele tiver credenciais sensiveis, os agentes dentro do sandbox ainda poderao le-lo.
- Quem controla o Docker no host ainda tem poder elevado. Para um modelo mais paranoico, use VM dedicada ou usuario separado no host.
