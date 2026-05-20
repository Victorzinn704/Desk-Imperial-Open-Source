# Guia De Evolucao Para Um Desenvolvedor Junior Forte

> Um mapa pratico para sair do "eu programo telas e endpoints" e entrar no modo engenharia: confiabilidade, seguranca, manutencao, produto e operacao.

## Ideia Central

Um junior forte nao e a pessoa que sabe decorar framework. E a pessoa que trabalha com metodo.

Ela entende que software real precisa:

- funcionar;
- ser seguro;
- ser observavel;
- ser testavel;
- ser simples de evoluir;
- ser documentado;
- ser operavel por outras pessoas.

O mercado esta cheio de gente que escreve codigo. Falta gente que constrói sistemas que sobrevivem.

## Como Pensar Como Engenheiro

Antes de implementar, responda:

```text
Qual problema real estou resolvendo?
Quem usa isso?
Qual dado entra?
Qual dado sai?
Quem pode acessar?
O que acontece se falhar?
Como vou testar?
Como vou observar em producao?
Como outro dev vai manter isso?
```

Se voce nao consegue responder, voce ainda nao entendeu o trabalho.

## Boas Praticas Que Valem Mais Que Moda

### Codigo Claro

Codigo bom nao tenta parecer inteligente. Ele tenta ser lido rapido.

Prefira:

- nomes explicitos;
- funcoes pequenas;
- blocos coesos;
- regras de negocio com nome;
- validacao perto da borda;
- side effects isolados.

Evite:

- funcao gigante;
- `if` aninhado demais;
- duplicacao de regra;
- parametro primitivo sem contexto;
- arquivo que faz tudo;
- comentario explicando gambiarra que poderia virar codigo claro.

### Complexidade

Complexidade cresce quando voce soma:

- muitos `if`;
- muitos loops;
- muitos parametros;
- muitos retornos misturados;
- estado compartilhado;
- regra de negocio escondida em componente/tela;
- funcao longa sem etapas naturais.

Uma boa regra:

```text
Se voce precisa rolar a tela varias vezes para entender uma funcao, extraia blocos naturais.
```

Exemplo mental:

```text
validar entrada
carregar entidades
autorizar usuario
executar regra
persistir
emitir evento
retornar resposta
```

Cada etapa pode virar funcao.

## Debug Profissional

Debug nao e sair colocando `console.log` em tudo. Debug e investigacao.

### Passo A Passo

```text
1. Reproduza o bug
2. Escreva o comportamento esperado
3. Escreva o comportamento atual
4. Localize a fronteira: frontend, API, banco, cache, fila, terceiro
5. Leia logs e request/response
6. Crie uma hipotese
7. Teste a hipotese com a menor alteracao possivel
8. Corrija a causa
9. Adicione teste/regressao
10. Documente se afetou fluxo critico
```

### Perguntas Boas

- O bug acontece sempre ou intermitente?
- Acontece em local, staging e producao?
- Depende de usuario, permissao, horario ou dado especifico?
- Houve deploy recente?
- O cache pode estar stale?
- O evento realtime chegou?
- A transacao no banco foi concluida?
- O sistema externo respondeu com sucesso?

## Workflow De Trabalho

Workflow e o caminho que transforma ideia em codigo confiavel.

Um workflow simples:

```text
1. Ticket ou objetivo
2. Analise do fluxo atual
3. Plano curto
4. Implementacao pequena
5. Teste local
6. Code review
7. CI
8. Deploy controlado
9. Observacao pos-deploy
10. Documentacao
```

Workflow ruim:

```text
codar direto -> commitar tudo -> push -> torcer
```

## Pipeline

Pipeline e a esteira automatizada que protege o projeto.

Um pipeline maduro costuma ter:

```text
install
lint
typecheck
unit tests
integration tests
build
security scan
coverage
artifact
deploy
smoke test
```

### Exemplo Conceitual

```yaml
name: ci
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup node
      - npm ci
      - npm run lint
      - npm run typecheck
      - npm run test
      - npm run build
```

Junior forte entende que pipeline nao e burocracia. Pipeline e protecao contra regressao.

## Ferramentas De Qualidade

### Lint

Lint encontra padroes ruins antes do runtime.

Serve para:

- padronizar estilo;
- evitar APIs perigosas;
- reduzir bugs comuns;
- impedir imports errados;
- proteger acessibilidade no frontend.

Exemplo:

```bash
npm run lint
```

### Typecheck

Typecheck valida contratos em tempo de compilacao.

Em TypeScript:

```bash
npm run typecheck
```

Ele nao prova que o sistema funciona, mas pega uma classe grande de erro antes de rodar.

### Vitest

Vitest roda testes unitarios e de integracao leve em projetos JS/TS.

Use para:

- regras de negocio;
- componentes;
- hooks;
- mappers;
- edge cases;
- regressao.

Exemplo:

```bash
npm run test
```

### CodeScene

CodeScene mede saude do codigo por sinais como complexidade, tamanho, duplicacao, hotspots e acoplamento de mudanca.

O valor real:

- mostra onde refatorar primeiro;
- combina complexidade tecnica com historico de mudanca;
- ajuda a evitar que arquivos populares virem monstros.

Como agir:

```text
1. Comece por bumpy road, metodo complexo e metodo grande
2. Extraia funcoes coesas
3. Reduza condicionais complexas
4. Quebre duplicacao real
5. Mantenha testes verdes
```

### SonarQube

SonarQube analisa bugs, vulnerabilidades, code smells, cobertura e duplicacao.

Use como quality gate:

- sem vulnerabilidade critica;
- sem bug bloqueante;
- cobertura minima onde faz sentido;
- duplicacao sob controle;
- novas mudancas sem degradacao.

### Codacy

Codacy funciona como revisao automatizada de qualidade e seguranca em PR.

E util para:

- padroes de codigo;
- duplicacao;
- complexidade;
- seguranca basica;
- visibilidade para time.

### k6

k6 testa carga e latencia.

Use para responder:

- quantas requisicoes por segundo o endpoint aguenta?
- p95 esta aceitavel?
- qual fluxo quebra sob carga?
- cache esta ajudando?

Exemplo:

```bash
k6 run tests/load/critical-flows.js
```

### Kubernetes / k8s

Kubernetes orquestra containers em escala.

Ele ajuda em:

- replicas;
- rolling deploy;
- service discovery;
- config/secrets;
- autoscaling;
- resiliencia.

Mas nao use cedo demais. Primeiro tenha Docker, healthcheck, logs e deploy previsivel. Kubernetes amplifica maturidade, mas tambem amplifica bagunca.

### Grafana

Grafana mostra dashboards.

Use para acompanhar:

- latencia;
- erros;
- CPU/memoria;
- filas;
- conexoes realtime;
- banco;
- cache.

### Prometheus

Prometheus coleta metricas.

Boas metricas:

- `http_request_duration_seconds`;
- `http_requests_total`;
- `queue_jobs_total`;
- `cache_hit_ratio`;
- `websocket_connected_clients`;
- `payment_webhook_latency_seconds`.

### Loki

Loki armazena logs com labels.

Bom para:

- buscar erro por servico;
- correlacionar request;
- investigar deploy;
- auditar falha de webhook.

### Sentry

Sentry captura excecoes, stack traces e performance.

Use para:

- erro frontend;
- erro backend;
- release tracking;
- traces;
- alertas.

Cuidados:

- nao enviar senha/token/cookie;
- mascarar email/CPF quando necessario;
- usar `beforeSend` para sanitizar payload.

### OSV / OSS Vulnerability Scanners

Ferramentas como OSV, npm audit, Dependabot e Snyk ajudam a achar vulnerabilidades em dependencias.

Regra:

```text
dependencia e codigo de terceiros rodando no seu produto.
```

Atualize com teste. Nao atualize cegamente.

## Seguranca Que Todo Junior Deve Aprender

Seguranca nao e etapa final. E propriedade do sistema.

### Entrada Externa Nao E Confiavel

Tudo que vem de fora pode ser malicioso:

- body JSON;
- query string;
- header;
- cookie;
- webhook;
- arquivo upload;
- mensagem de bot;
- resposta de API externa;
- evento de fila.

Use schema validation.

### Zod

Zod valida runtime.

TypeScript valida em compilacao. Zod valida dado real chegando em producao.

Exemplo:

```ts
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
})
```

Use em:

- controllers;
- webhooks;
- forms;
- env vars;
- respostas de APIs externas.

### SQL Injection

SQL injection acontece quando dado do usuario vira comando.

Errado:

```ts
db.query(`SELECT * FROM users WHERE email = '${email}'`)
```

Certo:

```ts
db.user.findUnique({ where: { email } })
```

Ou query parametrizada.

ORM ajuda, mas nao salva se voce usar raw query com string concatenada.

### XSS

XSS acontece quando entrada maliciosa vira HTML/JS executavel.

Cuidados:

- escapar HTML;
- evitar `dangerouslySetInnerHTML`;
- sanitizar Markdown;
- configurar CSP;
- nao confiar em campos como nome, descricao e observacao.

### Command Injection

Command injection acontece quando dado externo entra em comando de sistema.

Errado:

```ts
exec(`convert ${filename}`)
```

Certo:

```ts
spawn('convert', [safeFilename])
```

Prefira APIs estruturadas.

### Rate Limit

Rate limit limita abuso.

Use em:

- login;
- reset de senha;
- OTP;
- webhook publico;
- bot;
- cadastro;
- endpoints caros.

Rate limit bom considera:

- IP;
- usuario;
- workspace;
- recurso;
- janela de tempo.

### Retry

Retry ajuda quando falha e temporaria.

Use para:

- API externa instavel;
- webhook outbound;
- fila;
- processamento assíncrono.

Mas retry sem limite vira ataque contra seu proprio sistema.

Use:

- exponential backoff;
- jitter;
- limite maximo;
- idempotencia.

### Idempotencia

Idempotencia significa poder repetir uma operacao sem duplicar efeito.

Importante em:

- pagamentos;
- webhooks;
- criacao de pedido;
- envio de email;
- impressao;
- filas.

Exemplo:

```text
payment_event_id unico -> processa uma vez -> proximas repeticoes retornam ok sem duplicar
```

### JWT E Sessao

JWT nao impede roubo de sessao. Se alguem rouba um JWT valido, pode usar ate expirar.

Boas praticas:

- cookie `HttpOnly`;
- `Secure`;
- `SameSite`;
- expiracao curta;
- refresh token com rotacao;
- revogacao server-side quando necessario;
- auditoria de login;
- MFA quando o risco pedir.

Para sistemas financeiros/operacionais, sessao server-side com token opaco pode ser mais controlavel que JWT puro.

### CSRF

CSRF explora navegador autenticado para enviar requisicao sem intencao do usuario.

Defesas:

- SameSite;
- CSRF token;
- double-submit cookie;
- validar origem;
- nao ter GET com efeito colateral.

CSRF nao e certificado. Certificado/TLS protege transporte. CSRF protege intencao da requisicao.

### TLS, DNS E HTTPS

Para site publico:

- dominio com DNS correto;
- HTTPS obrigatorio;
- HSTS;
- redirect HTTP -> HTTPS;
- certificados renovando automaticamente;
- cookies `Secure`.

### Tunel Fechado

Tunel fechado evita expor servico direto na internet.

Exemplos:

- Tailscale;
- WireGuard;
- Cloudflare Tunnel;
- SSH tunnel.

Use para:

- Grafana;
- Prometheus;
- banco;
- painel interno;
- servidor de dev.

Nao exponha banco de dados na internet.

### Minimo Privilegio

Cada usuario, token e servico deve ter apenas o acesso necessario.

Exemplos:

- usuario app no banco nao deve ser superuser;
- token de deploy nao deve poder apagar repositorio;
- bot de Telegram nao deve acessar tudo;
- painel admin separado de usuario comum;
- service account por ambiente.

### Backup

Backup que nunca foi restaurado e apenas uma esperanca.

Tenha:

- backup automatico;
- retencao;
- criptografia;
- teste de restore;
- copia fora do servidor principal;
- runbook de desastre.

## APIs

API boa tem contrato claro.

### REST Versionada

Exemplo:

```text
GET /api/v1/products
POST /api/v1/orders
PATCH /api/v1/orders/:id/status
```

Use `v1`, `v2` quando quebrar contrato.

Nao quebre cliente sem versao ou migracao.

### OpenAPI

OpenAPI documenta contrato HTTP.

Ajuda em:

- SDK;
- testes;
- validacao;
- documentacao;
- alinhamento frontend/backend.

### API Estilo OpenAI

Um modelo de API inspirado em OpenAI costuma ter:

- endpoint unico por recurso;
- payload estruturado;
- resposta padronizada;
- streaming quando faz sentido;
- IDs rastreaveis;
- metadata;
- erros consistentes.

Exemplo conceitual:

```json
{
  "id": "evt_123",
  "object": "payment.intent",
  "status": "processing",
  "metadata": {
    "workspaceId": "..."
  }
}
```

Esse estilo e bom para plataformas com integrações, agentes e eventos.

### Erros De API

Erro bom ajuda o cliente a agir.

```json
{
  "code": "PAYMENT_TERMINAL_OFFLINE",
  "message": "A maquininha esta offline.",
  "requestId": "req_123"
}
```

Evite vazar stack trace ou detalhe interno.

## Banco De Dados

### Relacional

Bancos relacionais, como PostgreSQL, MySQL e SQL Server, organizam dados em tabelas com relacionamentos.

Use quando:

- precisa de transacao;
- precisa de consistencia;
- ha relacionamento forte entre entidades;
- precisa consultar com filtros complexos;
- dinheiro, estoque, pedido, usuario e permissao importam.

Exemplo:

```text
users
orders
order_items
products
payments
```

Em sistema comercial, relacional costuma ser base principal.

### Nao Relacional

Bancos nao relacionais incluem documentos, chave-valor, grafos e colunas.

Use quando:

- dados variam muito;
- escala de escrita/leitura exige modelo especifico;
- consulta e mais por documento inteiro;
- baixa necessidade de join;
- evento/log/documento e unidade natural.

Exemplos:

- MongoDB para documento flexivel;
- DynamoDB para chave-valor em escala;
- Elasticsearch/OpenSearch para busca;
- Neo4j para grafo.

Nao use NoSQL porque parece moderno. Use quando o modelo encaixa.

### Redis

Redis e armazenamento em memoria.

Excelente para:

- cache;
- rate limit;
- sessoes;
- locks curtos;
- pub/sub;
- filas simples;
- dados temporarios;
- deduplicacao de webhook.

Nao use Redis como banco definitivo de dados financeiros sem persistencia e estrategia clara.

### Cache

Cache melhora desempenho, mas cria risco de dado velho.

Perguntas:

- qual chave?
- qual TTL?
- quando invalida?
- o que acontece se Redis cair?
- dado stale e aceitavel?

Exemplo:

```text
products:workspace:123 -> TTL 60s
operations:live:workspace:123 -> invalida apos mutacao de comanda
```

### Quando Usar Mais De Um Banco

Use mais de um banco quando houver motivo tecnico claro:

- PostgreSQL para transacao;
- Redis para cache/session/realtime;
- OpenSearch para busca textual;
- S3/Object Storage para arquivos;
- data warehouse para BI.

Evite poliglotismo cedo demais. Cada banco novo cria custo:

- backup;
- monitoramento;
- seguranca;
- deploy;
- migracao;
- conhecimento do time.

## Escalabilidade

Escalabilidade nao e comecar com microservicos. Escalabilidade e remover gargalos com criterio.

Ordem comum:

```text
1. Medir
2. Otimizar queries
3. Adicionar indices
4. Cachear leitura quente
5. Tirar trabalho pesado do request
6. Usar fila
7. Escalar horizontalmente
8. Separar servico quando fronteira estiver clara
```

### Load Balancer

Load balancer distribui trafego entre instancias.

Precisa de:

- healthcheck;
- app stateless ou sessao compartilhada;
- Redis/pubsub para realtime multi-instancia;
- logs centralizados;
- deploy rolling.

### Fila

Fila desacopla trabalho lento.

Use para:

- email;
- notificacao;
- processamento de imagem;
- webhook outbound;
- relatorio pesado;
- impressao pos-pagamento;
- sincronizacao com terceiros.

## Observabilidade

Observabilidade e conseguir responder o que aconteceu.

Tres pilares:

```text
logs
metricas
traces
```

### Logs

Log bom tem:

- timestamp;
- nivel;
- requestId;
- userId/workspaceId quando permitido;
- evento;
- contexto;
- sem segredo.

### Metricas

Metricas boas mostram tendencia.

Exemplos:

- p50/p95/p99 de latencia;
- taxa de erro;
- fila acumulada;
- cache hit ratio;
- CPU/memoria;
- conexoes websocket;
- jobs falhos.

### Traces

Trace mostra caminho da requisicao entre servicos.

Ajuda quando:

- API chama banco;
- API chama gateway de pagamento;
- webhook chama fechamento de comanda;
- fechamento dispara impressao;
- notificacao vai para Telegram.

## Documentacao E Relatorios

Documentacao boa nao e texto infinito. E transferencia de contexto.

Tipos uteis:

- README: como rodar;
- arquitetura: decisoes e fronteiras;
- runbook: como operar;
- ADR: decisao arquitetural;
- checklist: deploy/teste;
- postmortem: incidente e acao;
- relatorio de refatoracao: antes/depois/risco/teste.

Modelo de ADR:

```md
# ADR: usar Redis para cache de snapshot operacional

## Contexto

...

## Decisao

...

## Consequencias

...
```

## Code Review

Code review nao e procurar defeito para humilhar. E reduzir risco.

Olhe:

- contrato publico;
- seguranca;
- edge cases;
- duplicacao;
- complexidade;
- teste;
- performance;
- clareza;
- rollback.

Pergunta chave:

```text
Se isso quebrar em producao, teremos como descobrir e voltar?
```

## Agentes De IA Na Codificacao

Agente de IA e ferramenta de produtividade, nao substituto de responsabilidade.

Use IA para:

- ler codigo grande;
- propor plano;
- gerar testes iniciais;
- refatorar blocos mecanicos;
- revisar complexidade;
- explicar erro;
- produzir documentacao;
- comparar alternativas.

Nao use IA para:

- colar segredo;
- aceitar mudanca sem revisar;
- executar comando destrutivo sem entender;
- inventar regra de negocio;
- substituir teste;
- decidir arquitetura sem contexto real.

### Workflow Seguro Com IA

```text
1. Defina objetivo claro
2. Mostre arquivos relevantes
3. Peça plano pequeno
4. Execute em branch
5. Revise diff
6. Rode testes
7. Peça segunda revisão focada em risco
8. Documente decisao
```

Prompt bom:

```text
Leia estes arquivos e proponha uma refatoracao que reduza complexidade sem mudar contrato publico. Priorize extrair funcoes coesas, manter testes e explicar riscos.
```

Prompt ruim:

```text
Melhora esse projeto todo.
```

## Casos De Uso Praticos

### Criar Endpoint Seguro

```text
1. Definir contrato
2. Criar schema Zod
3. Validar auth
4. Validar permissao
5. Usar ORM/query parametrizada
6. Tratar erro
7. Testar sucesso/erro/permissao
8. Documentar OpenAPI
9. Adicionar log sem PII
```

### Criar Fluxo De Pagamento

```text
1. Criar payment intent local
2. Enviar para provedor
3. Salvar externalId
4. Processar webhook idempotente
5. Fechar pedido/comanda em transacao
6. Emitir evento realtime
7. Enfileirar impressao/notificacao
8. Exibir status ao usuario
9. Registrar auditoria
```

### Criar Cache

```text
1. Identificar leitura quente
2. Definir chave
3. Definir TTL
4. Definir invalidador
5. Criar fallback se Redis cair
6. Medir hit ratio
7. Documentar risco de dado stale
```

### Criar Chatbot Inteligente

```text
1. Definir intents
2. Validar usuario/canal
3. Separar roteamento de execucao
4. Usar contexto minimo necessario
5. Proteger prompt injection
6. Registrar requestId
7. Responder rapido
8. Processar tarefas longas em fila
```

## Roteiro De Crescimento

### Primeiros 30 Dias

- dominar Git;
- rodar projeto local;
- entender request/response;
- escrever teste simples;
- ler logs;
- corrigir bug pequeno.

### 60 Dias

- criar endpoint com validacao;
- mexer em banco com migracao;
- criar componente testavel;
- usar cache simples;
- entender CI;
- fazer PR com boa descricao.

### 90 Dias

- refatorar hotspot pequeno;
- investigar bug de producao com logs;
- criar dashboard basico;
- documentar runbook;
- participar de decisao tecnica;
- entender custo de seguranca e performance.

## O Que Diferencia Um Junior Forte

Um junior forte:

- nao finge certeza;
- pergunta melhor;
- valida entrada externa;
- escreve teste para regra importante;
- entende que banco de dados nao e planilha;
- nao expõe segredo;
- sabe usar Git sem medo;
- aceita code review;
- documenta o que muda operacao;
- pensa em usuario e manutencao.

## Fechamento

Voce nao vira pleno por decorar nomes de ferramenta. Voce evolui quando entende os motivos:

```text
Git protege historico.
Teste protege comportamento.
Tipo protege contrato.
Schema protege runtime.
Observabilidade protege operacao.
Documentacao protege continuidade.
Seguranca protege usuario e negocio.
Simplicidade protege o futuro.
```

Esse e o caminho das pedras.
