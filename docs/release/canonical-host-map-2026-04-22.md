# Canonical Host Map

## 2026-04-22

Nomenclatura operacional oficial para evitar erro de tenancy, função ou cutover.

## Hosts

| Código | Dono   | Papel                           | IP público        | WireGuard      | Observação                                               |
| ------ | ------ | ------------------------------- | ----------------- | -------------- | -------------------------------------------------------- |
| `vm1`  | Joao   | app/api do Desk                 | `163.176.171.242` | `10.220.10.1`  | tráfego público do produto                               |
| `vm2`  | Joao   | observabilidade e monitoramento | `147.15.60.224`   | `10.220.10.2`  | Grafana, Prometheus, Loki, Tempo, Alertmanager, Metabase |
| `vm3`  | Joao   | imagem                          | pendente          | pendente       | serviço auxiliar, endurecer depois da camada de dados    |
| `vm4`  | Lohana | banco PostgreSQL do Desk        | `167.126.17.2`    | `10.220.10.10` | Ampere `2 OCPU / 12 GB`                                  |
| `vm5`  | Lohana | backup/runner do banco          | `134.65.19.53`    | `10.220.10.11` | E2 micro, restore-check e pgBadger                       |

## Hosts que não devem ser confundidos

- `134.65.240.222` é a A1 extra da Lohana. Ela não é a `vm2` oficial.
- Não subir Grafana, Prometheus, Loki, Tempo, Alertmanager, Metabase ou Sonar nessa A1 enquanto a `vm2` oficial estiver ativa.
- Se ela for usada depois, documentar antes o novo papel como staging, replica ou reserva.

## Regras de uso

- nunca operar por `vm-free-01` / `vm-free-02` sozinho em documento de execução;
- sempre mapear primeiro para `vm1` a `vm5`;
- em comando remoto, registrar IP e código do host;
- antes de subir stack de observabilidade, validar `hostname`, `wg show` e `docker ps` no host alvo;
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
