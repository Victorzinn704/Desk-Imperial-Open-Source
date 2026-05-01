# Oracle Runner Stack — restore drill e pgBadger

Esta pasta materializa a camada leve da **AMD micro da Lohana**.

## Papel

- `restore drill` fora do host primário
- geração de relatórios `pgBadger`
- checagem operacional do repositório `pgBackRest`

Ela **não** hospeda PostgreSQL, Metabase, Prometheus ou qualquer componente do caminho crítico.

## Como subir

1. sincronize a pasta `infra/` do repositório para `/opt/desk-imperial/infra`
2. copie `infra/oracle/runner/.env.example` para `infra/oracle/runner/.env`
3. preencha os segredos do `pgBackRest` e os dados de SSH da Ampere
4. suba o túnel WireGuard do runner
5. suba a utility image:

```bash
bash infra/scripts/oracle-runner-bootstrap.sh up
```

## Comandos operacionais

```bash
bash infra/scripts/oracle-runner-bootstrap.sh ps
bash infra/scripts/oracle-runner-bootstrap.sh restore-check
bash infra/scripts/oracle-runner-bootstrap.sh pgbadger
```

Os artefatos ficam em:

- relatórios: `infra/oracle/runner/reports`
- workspace temporário de restore: `infra/oracle/runner/restore`

## Timers

Templates de `systemd`:

- `systemd/restore-check.service`
- `systemd/restore-check.timer`
- `systemd/pgbadger-report.service`
- `systemd/pgbadger-report.timer`

Instale no host runner para automatizar restore drills e relatórios diários.
