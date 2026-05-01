# Lohana OCI Inventory

## 2026-04-22

Inventario validado diretamente na tenancy da Lohana via OCI API e por SSH.

## Estado real

### Instancias ativas

| Label operacional     | Display name OCI     | Shape                    | CPU / RAM        | IP publico       | IP privado   | Estado    |
| --------------------- | -------------------- | ------------------------ | ---------------- | ---------------- | ------------ | --------- |
| `lohana-a1-01`        | `vm-free-01`         | `VM.Standard.A1.Flex`    | `2 OCPU / 12 GB` | `167.126.17.2`   | `10.0.0.223` | `RUNNING` |
| `lohana-a1-02`        | `vm-free-02`         | `VM.Standard.A1.Flex`    | `2 OCPU / 12 GB` | `134.65.240.222` | `10.0.0.176` | `RUNNING` |
| `lohana-e2-runner-01` | `lohana-e2-micro-01` | `VM.Standard.E2.1.Micro` | `1 OCPU / 1 GB`  | `134.65.19.53`   | `10.0.0.132` | `RUNNING` |

## Storage real

### Boot volumes

| Boot volume                        | Tamanho |
| ---------------------------------- | ------- |
| `lohana-e2-micro-01 (Boot Volume)` | `50 GB` |
| `vm-free-01 (Boot Volume)`         | `70 GB` |
| `vm-free-02 (Boot Volume)`         | `70 GB` |

**Total atual:** `190 GB`

Leitura pratica:

- o limite free de storage esta praticamente fechado;
- hoje sobraram **10 GB**, nao `60 GB`;
- **nao cabe criar outra micro free** sem destruir volume existente ou sair do envelope free.

## SSH validado

As duas A1 e a micro existente aceitaram SSH com a chave local da pasta `Oracle-Lohana`.

Validacoes feitas:

- conexao SSH ok;
- SO Ubuntu 24.04;
- A1s limpas, sem Docker e com cerca de `64 GB` livres em `/`;
- micro limpa, sem Docker e com cerca de `45 GB` livres em `/`.

## Distribuicao recomendada

### Agora

- `lohana-a1-01` (`167.126.17.2`) -> **PostgreSQL primario**
- `lohana-e2-runner-01` (`134.65.19.53`) -> **runner/bastion/restore-check/pgBadger**
- `lohana-a1-02` (`134.65.240.222`) -> **reserva fria**, staging de restore, futura replica ou host de suporte

### O que nao fazer agora

- nao criar outra micro;
- nao colocar BI/observabilidade junto do banco;
- nao forcar uso da segunda A1 so porque ela existe;
- nao manter a nomenclatura `vm-free-01` / `vm-free-02` sem prefixo de tenancy nos runbooks.

## Convencao de nomes para evitar erro operacional

Nos documentos e comandos, usar:

- `lohana-a1-01` para `vm-free-01`
- `lohana-a1-02` para `vm-free-02`
- `lohana-e2-runner-01` para `lohana-e2-micro-01`

Motivo:

- ja existe colisao de nomes com outras VMs do projeto;
- operar por nome generico aqui aumenta risco de cutover no host errado.

## Proximo passo operacional

1. fixar `lohana-a1-01` como host do banco;
2. fixar `lohana-e2-runner-01` como runner;
3. preparar WireGuard entre:
   - app/prod
   - ops/metabase
   - `lohana-a1-01`
   - `lohana-e2-runner-01`
4. manter `lohana-a1-02` parada do ponto de vista funcional ate o banco estabilizar.
