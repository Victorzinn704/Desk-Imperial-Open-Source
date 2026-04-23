# Canonical Host Map
## 2026-04-22

Nomenclatura operacional oficial para evitar erro de tenancy, função ou cutover.

## Hosts

| Código | Dono | Papel | Observação |
| --- | --- | --- | --- |
| `vm1` | Joao | app/api do Desk | tráfego público do produto |
| `vm2` | Joao | observabilidade e monitoramento | Grafana, Prometheus, Loki, Tempo, Alertmanager, Metabase |
| `vm3` | Joao | imagem | serviço auxiliar, endurecer depois da camada de dados |
| `vm4` | Lohana | banco PostgreSQL do Desk | Ampere `2 OCPU / 12 GB` |
| `vm5` | Lohana | backup/runner do banco | E2 micro, restore-check e pgBadger |

## Regras de uso

- nunca operar por `vm-free-01` / `vm-free-02` sozinho em documento de execução;
- sempre mapear primeiro para `vm1` a `vm5`;
- em comando remoto, registrar IP e código do host;
- toda mudança de segurança deve deixar claro se vale para:
  - `vm1-vm3` (Joao)
  - `vm4-vm5` (Lohana)

## Prioridade de hardening

### Fase atual

- `vm4`
- `vm5`

### Próxima passada obrigatória

- `vm1`
- `vm2`
- `vm3`

Objetivo:
- manter o mesmo padrão mínimo de SSH hardening, firewall local, redução de superfície exposta e observabilidade segura nas cinco VMs.
