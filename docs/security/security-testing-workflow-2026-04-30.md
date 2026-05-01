# Security Testing Workflow — 2026-04-30

## Objetivo

Separar tres coisas que costumam virar confusao:

1. **seguranca de codigo**
2. **seguranca de exposicao de infraestrutura**
3. **monitoramento continuo de trafego e eventos**

O Desk Imperial precisa das tres, mas **na ordem certa**.

---

## Estado atual do Desk Imperial

Hoje a cobertura real ja existente e esta:

- `lint:secrets` -> segredos expostos no codigo rastreado
- `lint:sast` -> vulnerabilidades estaticas no codigo
- `audit:deps` -> vulnerabilidades em dependencias
- `lint:deps` / `lint:cycles` -> quebra de fronteiras e ciclos
- `SonarQube local` -> qualidade historica e hotspots

Isso cobre a parte **antes do deploy**.

O que falta fechar melhor e a parte **depois do deploy**:

- superficie exposta do servidor
- servicos abertos por engano
- deteccao continua de trafego malicioso
- correlacao de logs e eventos de seguranca

---

## Veredito direto sobre as ferramentas

| Ferramenta       | Usar agora?             | Papel certo no Desk Imperial                                                                         |
| ---------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| **Nmap**         | **Sim**                 | teste de superficie exposta: portas abertas, servicos, versoes e drift de exposicao                  |
| **Snort**        | **Nao agora**           | IDS/IPS de rede para monitoramento continuo, nao scanner pontual do projeto                          |
| **Wazuh / SIEM** | **Depois**              | correlacao centralizada de eventos, logs, alertas e agentes quando a operacao ficar mais distribuida |
| **NetFlow**      | **Nao como prioridade** | metrica e estatistica de trafego; nao substitui teste de seguranca do produto                        |

---

## Por que essa decisao esta correta

### Nmap

O Nmap e a ferramenta certa para o **teste ativo** da exposicao do servidor.

Segundo a documentacao oficial, a deteccao de versao interroga portas descobertas para identificar protocolo, aplicacao e versao do servico em execucao. Isso e exatamente o que precisamos para achar:

- Redis exposto por engano
- Postgres exposto por engano
- servicos internos vazando para internet
- portas nao documentadas
- drift de versao/servico no host publicado

Fonte oficial:

- Nmap service/version detection: https://nmap.org/book/man-version-detection.html

### Snort

Snort nao e a ferramenta principal para “testar o projeto” de forma pontual.

A propria documentacao oficial descreve o Snort como um IPS/IDS com **analise de trafego em tempo real** e **packet logging**. Isso faz sentido quando voce quer:

- detectar scans recorrentes
- detectar brute force
- detectar padroes de ataque conhecidos
- opcionalmente bloquear em linha

Ou seja: Snort e mais **vigilancia operacional** do que auditoria inicial do produto.

Fontes oficiais:

- https://www.snort.org/
- https://docs.snort.org/start/

### Wazuh / SIEM

Wazuh faz sentido quando queremos centralizar deteccao e correlacao, nao apenas “testar se o servidor esta exposto”.

A documentacao oficial define Wazuh como plataforma open source que unifica **XDR e SIEM**, protegendo workloads e agregando eventos e telemetria.

No Desk Imperial, isso comeca a fazer mais sentido quando:

- houver mais de um host critico
- quisermos correlacionar audit logs, auth failures, processos, integridade de arquivos e alertas de host
- quisermos alertas continuos e resposta operacional mais madura

Fontes oficiais:

- https://documentation.wazuh.com/current/getting-started/index.html
- https://wazuh.com/platform/

### NetFlow

NetFlow ajuda em visibilidade de fluxo e volume, nao em avaliacao profunda do produto.

Pela documentacao da Cisco, o foco e metrica de trafego, planejamento, accounting, monitoramento e analise. Isso pode ajudar em capacidade e anomalia de rede, mas **nao substitui**:

- scanner de superficie
- IDS/IPS
- SAST/SCA
- correlacao de eventos de aplicacao

Fonte oficial:

- https://www.cisco.com/c/en/us/tech/quality-of-service-qos/netflow/index.html

---

## Fluxo recomendado para o Desk Imperial

### Etapa 1 — Seguranca de codigo e build

Rodar sempre:

```bash
npm run lint:secrets
npm run lint:sast
npm run audit:deps
npm run lint:deps
npm run lint:cycles
```

Objetivo:

- nao empurrar segredo
- nao empurrar vulnerabilidade estatica
- nao empurrar dependencia vulneravel
- nao piorar a arquitetura

### Etapa 2 — SonarQube local

Rodar sempre que formos consolidar baseline de qualidade ou atacar hotspots:

```bash
npm run sonar:up
```

Hoje, neste host, o bloqueio atual e simples:

- o cliente Docker existe
- o daemon Docker nao esta rodando

Sem Docker daemon, o Sonar local nao sobe.

### Etapa 3 — Nmap como teste de superficie

Rodar:

- antes de release importante de infraestrutura
- depois de mudanca de proxy/firewall/compose
- mensalmente como checagem de exposicao

Comando padronizado no repo:

```bash
npm run security:nmap -- -Target api.deskimperial.online -Mode quick
```

Modos:

- `quick` -> portas criticas esperadas
- `top1000` -> superficie mais ampla
- `full` -> 1-65535, usar com mais parcimonia

Saida:

- `.cache/security/nmap/`

### Etapa 3.1 — Regra de precondicao para allowlist de origem

Antes de ativar allowlist de Cloudflare no `nginx` ou no `ufw`, valide isto:

1. `app.deskimperial.online` e `api.deskimperial.online` chegam na origem **somente** via Cloudflare
2. ou os IPs extras legitimos estao mapeados e aprovados:
   - monitoria/blackbox
   - administracao
   - qualquer outro origin consumer conhecido

Se isso nao estiver provado, a allowlist vira incidente de disponibilidade, nao hardening.

O wrapper do repo ficou preparado para:

- rollback automatico
- confirmacao explicita
- ranges extras IPv4/IPv6

### Etapa 4 — Snort so quando a borda justificar

Snort entra quando quisermos **detectar e reagir** a trafego malicioso continuamente.

Nao entra agora como gate de desenvolvimento.

Entradas tipicas para adotar Snort:

- crescimento de brute force em auth
- necessidade de IDS/IPS no host publico
- necessidade de correlacionar assinaturas de ataque com observabilidade

No estado atual do Desk Imperial, se precisarmos evoluir observabilidade de host/evento antes de IDS de rede, a recomendacao continua:

1. **Wazuh antes de Snort**
2. Snort apenas quando houver necessidade clara de IDS/IPS na borda

### Etapa 5 — Wazuh quando a operacao ficar maior

Wazuh entra quando quisermos:

- agentes nos hosts
- correlacao central
- integridade de arquivos
- eventos do SO
- postura de seguranca de host
- visao consolidada de incidentes

Hoje eu trataria isso como **fase de maturidade operacional**, nao como bloqueio para o proximo sprint.

---

## Sequencia pratica para as proximas semanas

### Agora

1. subir Docker daemon local
2. rodar SonarQube local
3. rodar Nmap quick contra `api.deskimperial.online`
4. registrar baseline de portas e servicos expostos

### Depois

1. rodar Nmap `top1000` apos qualquer mudanca de infra
2. decidir se o edge precisa mesmo de Snort
3. avaliar Wazuh quando o escopo de observabilidade/soc crescer

---

## O que nao fazer

1. nao confundir NetFlow com IDS
2. nao tentar usar Snort como substituto de Semgrep/Sonar/Gitleaks
3. nao jogar SIEM pesado antes de termos baseline simples de exposicao
4. nao tratar “mais ferramenta” como sinonimo de “mais seguranca”

---

## Definition of done desta trilha

1. SonarQube local sobe e gera baseline
2. Nmap quick roda e o relatorio fica salvo
3. temos lista aprovada de portas/servicos expostos
4. qualquer divergencia de exposicao vira issue de seguranca
5. Snort e Wazuh ficam como decisoes conscientes de fase seguinte, nao impulso
