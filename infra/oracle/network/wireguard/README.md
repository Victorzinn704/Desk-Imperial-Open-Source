# WireGuard — malha privada entre Oracle e a Lohana

O banco da Lohana está em **tenancy separada**. Por isso, o padrão é:

- `vm-free-01` <-> `lohana-ampere-01`
- `vm-free-02` <-> `lohana-ampere-01`
- `lohana-amd-micro-01` <-> `lohana-ampere-01`

Não use IP público para PostgreSQL, PgBouncer, exporters ou Metabase.

## Faixa sugerida

- `vm-free-01`: `10.220.10.1/32`
- `vm-free-02`: `10.220.10.2/32`
- `lohana-ampere-01`: `10.220.10.10/32`
- `lohana-amd-micro-01`: `10.220.10.11/32`

## Arquivos

- `wg-prod.example.conf`
- `wg-ops.example.conf`
- `wg-db.example.conf`
- `wg-runner.example.conf`

## Aplicação

1. gere as chaves em cada host:

```bash
wg genkey | tee privatekey | wg pubkey > publickey
```

2. copie o template correto
3. substitua os placeholders
4. salve como `/etc/wireguard/wg0.conf`
5. suba:

```bash
sudo systemctl enable --now wg-quick@wg0
sudo wg show
```

## Rotas esperadas

- `vm-free-01` alcança `10.220.10.10:5432`, `6432`, `9100`, `9187`
- `vm-free-02` alcança `10.220.10.10:5432`, `9100`, `9187`
- `lohana-amd-micro-01` alcança apenas o SSH privado da Ampere para `pgBadger`; ele não precisa de acesso SQL ao banco
- a Ampere responde apenas pelos peers da malha
