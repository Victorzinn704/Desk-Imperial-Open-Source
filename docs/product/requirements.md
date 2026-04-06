# Requisitos — Desk Imperial

**Versão:** 1.0  
**Última atualização:** 2026-04-01  
**Base:** comportamento real do código em produção

---

## Como ler este documento

- **RF** = Requisito Funcional — o que o sistema faz
- **RNF** = Requisito Não-Funcional — como o sistema se comporta
- **Status:** Implementado | Parcial | Planejado | Bloqueado

---

## Requisitos Funcionais

### RF-01 — Autenticação e sessão

| ID      | Requisito                                                                    | Status       |
| ------- | ---------------------------------------------------------------------------- | ------------ |
| RF-01.1 | O sistema deve permitir cadastro com nome, e-mail e senha                    | Implementado |
| RF-01.2 | O sistema deve verificar o e-mail antes de ativar a conta                    | Implementado |
| RF-01.3 | O sistema deve autenticar via e-mail e senha com cookie HttpOnly             | Implementado |
| RF-01.4 | O sistema deve emitir token CSRF em cada sessão e validar em mutações        | Implementado |
| RF-01.5 | O sistema deve encerrar a sessão no logout e limpar os cookies               | Implementado |
| RF-01.6 | O sistema deve suportar recuperação de senha por e-mail com token temporário | Implementado |
| RF-01.7 | O sistema deve bloquear login após tentativas excessivas (rate limit)        | Implementado |
| RF-01.8 | O sistema deve registrar eventos de autenticação no audit log                | Implementado |

---

### RF-02 — Controle de acesso por papel

| ID      | Requisito                                               | Status       |
| ------- | ------------------------------------------------------- | ------------ |
| RF-02.1 | O sistema deve suportar dois papéis: OWNER e STAFF      | Implementado |
| RF-02.2 | OWNER deve ter acesso a todas as seções do painel       | Implementado |
| RF-02.3 | STAFF deve ter acesso apenas a PDV, vendas e calendário | Implementado |
| RF-02.4 | Dados de um workspace nunca devem ser visíveis em outro | Implementado |

---

### RF-03 — Admin PIN

| ID      | Requisito                                                                | Status       |
| ------- | ------------------------------------------------------------------------ | ------------ |
| RF-03.1 | OWNER deve poder configurar um PIN de 4 dígitos                          | Implementado |
| RF-03.2 | O PIN deve ser exigido para ações sensíveis (desconto, cancelamento)     | Implementado |
| RF-03.3 | Verificação do PIN deve ocorrer server-side com challenge efêmero        | Implementado |
| RF-03.4 | O sistema deve bloquear o PIN após 3 tentativas incorretas por 5 minutos | Implementado |
| RF-03.5 | OWNER deve poder remover o PIN configurado                               | Implementado |

---

### RF-04 — PDV e Comandas

| ID       | Requisito                                                                 | Status       |
| -------- | ------------------------------------------------------------------------- | ------------ |
| RF-04.1  | O sistema deve permitir abertura de comanda com nome, CPF ou CNPJ         | Implementado |
| RF-04.2  | O sistema deve validar CPF e CNPJ com algoritmo real (não só comprimento) | Implementado |
| RF-04.3  | Comanda deve ter 4 status: Aberta, Em Preparo, Pronta, Fechada            | Implementado |
| RF-04.4  | O operador deve poder mover a comanda entre status com arrastar e soltar  | Implementado |
| RF-04.5  | O sistema deve permitir adicionar e remover itens de uma comanda aberta   | Implementado |
| RF-04.6  | O sistema deve permitir aplicar desconto ou acréscimo por comanda         | Implementado |
| RF-04.7  | O desconto acima do limite deve exigir Admin PIN                          | Implementado |
| RF-04.8  | Toda a equipe do workspace deve ver as comandas em tempo real             | Implementado |
| RF-04.9  | O sistema deve registrar qual funcionário está vinculado a cada comanda   | Implementado |
| RF-04.10 | O sistema deve manter histórico de comandas fechadas                      | Implementado |

---

### RF-05 — Operação em tempo real

| ID      | Requisito                                                                                   | Status       |
| ------- | ------------------------------------------------------------------------------------------- | ------------ |
| RF-05.1 | O sistema deve propagar mudanças de comanda para todos os clientes conectados via Socket.IO | Implementado |
| RF-05.2 | Cada workspace deve ter seu próprio canal de eventos isolado                                | Implementado |
| RF-05.3 | A conexão Socket.IO deve ser autenticada — sessão inválida deve ser rejeitada               | Implementado |
| RF-05.4 | O frontend deve aplicar patches otimistas sem recarregar a página                           | Implementado |

---

### RF-06 — Gestão de produtos e portfólio

| ID      | Requisito                                                                | Status       |
| ------- | ------------------------------------------------------------------------ | ------------ |
| RF-06.1 | OWNER deve poder cadastrar produtos com nome, preço, categoria e unidade | Implementado |
| RF-06.2 | O sistema deve suportar combos com itens componentes e preço agrupado    | Implementado |
| RF-06.3 | Produtos devem poder ser ativados e desativados sem exclusão             | Implementado |
| RF-06.4 | OWNER deve poder definir preço em múltiplas moedas (BRL, USD, EUR)       | Implementado |
| RF-06.5 | Importação de produtos via CSV                                           | Implementado |

---

### RF-07 — Pedidos e estoque

| ID      | Requisito                                                                             | Status       |
| ------- | ------------------------------------------------------------------------------------- | ------------ |
| RF-07.1 | O sistema deve criar pedidos com múltiplos itens vinculados a um funcionário          | Implementado |
| RF-07.2 | A criação de pedido deve validar disponibilidade de estoque em transação serializable | Implementado |
| RF-07.3 | O sistema deve decrementar estoque automaticamente ao confirmar o pedido              | Implementado |
| RF-07.4 | Pedidos cancelados devem reverter o estoque                                           | Implementado |
| RF-07.5 | O sistema deve calcular lucro por pedido com base no custo e preço de venda           | Implementado |

---

### RF-08 — Financeiro

| ID      | Requisito                                                                    | Status       |
| ------- | ---------------------------------------------------------------------------- | ------------ |
| RF-08.1 | O sistema deve exibir receita, custo e margem por período (dia, semana, mês) | Implementado |
| RF-08.2 | O sistema deve mostrar ranking de top produtos por receita                   | Implementado |
| RF-08.3 | O sistema deve mostrar ranking de top vendedores por volume                  | Implementado |
| RF-08.4 | O sistema deve suportar conversão de valores entre BRL, USD e EUR            | Implementado |
| RF-08.5 | Cotações de moeda devem ser obtidas via API com cache e fallback             | Implementado |

---

### RF-09 — Folha de pagamento

| ID      | Requisito                                                                       | Status       |
| ------- | ------------------------------------------------------------------------------- | ------------ |
| RF-09.1 | OWNER deve poder configurar salário base por funcionário                        | Implementado |
| RF-09.2 | O sistema deve calcular comissão percentual sobre as vendas de cada funcionário | Implementado |
| RF-09.3 | A folha deve ser calculada automaticamente a partir das vendas registradas      | Implementado |
| RF-09.4 | OWNER deve poder visualizar a folha consolidada do período                      | Implementado |

---

### RF-10 — Gestão de equipe

| ID      | Requisito                                                                         | Status       |
| ------- | --------------------------------------------------------------------------------- | ------------ |
| RF-10.1 | OWNER deve poder cadastrar funcionários com nome, cargo e configurações de acesso | Implementado |
| RF-10.2 | O sistema deve manter histórico de vendas por funcionário                         | Implementado |
| RF-10.3 | O sistema deve exibir ranking de vendedores com metas                             | Implementado |
| RF-10.4 | Funcionários devem poder fazer login com credenciais próprias                     | Implementado |

---

### RF-11 — Calendário comercial

| ID      | Requisito                                                                        | Status       |
| ------- | -------------------------------------------------------------------------------- | ------------ |
| RF-11.1 | OWNER deve poder criar eventos no calendário (promoções, datas especiais, jogos) | Implementado |
| RF-11.2 | Eventos devem poder ser arrastados para reposicionamento no calendário           | Implementado |
| RF-11.3 | O sistema deve correlacionar eventos com as vendas do período correspondente     | Implementado |

---

### RF-12 — Mapa de vendas

| ID      | Requisito                                                             | Status       |
| ------- | --------------------------------------------------------------------- | ------------ |
| RF-12.1 | O sistema deve plotar pedidos no mapa com base no endereço do cliente | Implementado |
| RF-12.2 | O sistema deve geocodificar endereços via Nominatim (OpenStreetMap)   | Implementado |
| RF-12.3 | O mapa deve mostrar concentração de pedidos por bairro e região       | Implementado |

---

### RF-13 — Export

| ID      | Requisito                                                                     | Status       |
| ------- | ----------------------------------------------------------------------------- | ------------ |
| RF-13.1 | O sistema deve permitir exportar pedidos em formato CSV                       | Implementado |
| RF-13.2 | O arquivo CSV deve ter encoding UTF-8 compatível com Excel e Google Planilhas | Implementado |

---

### RF-14 — Insight com IA

| ID      | Requisito                                                                      | Status       |
| ------- | ------------------------------------------------------------------------------ | ------------ |
| RF-14.1 | O sistema deve gerar resumo executivo com base nos dados do negócio via Gemini | Implementado |
| RF-14.2 | O resultado do insight deve ser cacheado para evitar requisições repetidas     | Implementado |
| RF-14.3 | O acesso ao insight deve ter rate limit para controlar custo de API            | Implementado |

---

### RF-15 — LGPD e consentimento

| ID      | Requisito                                                                    | Status       |
| ------- | ---------------------------------------------------------------------------- | ------------ |
| RF-15.1 | O sistema deve exibir banner de consentimento de cookies ao usuário          | Implementado |
| RF-15.2 | Preferências de cookies devem ser armazenadas por usuário autenticado        | Implementado |
| RF-15.3 | O sistema deve versionar documentos legais (termos, política de privacidade) | Implementado |
| RF-15.4 | O aceite de documentos legais deve ser registrado com data e versão          | Implementado |

---

### RF-16 — Mobile

| ID      | Requisito                                                                    | Status       |
| ------- | ---------------------------------------------------------------------------- | ------------ |
| RF-16.1 | OWNER deve ter painel executivo otimizado para celular                       | Implementado |
| RF-16.2 | STAFF deve ter PDV e atendimento funcionais pelo celular                     | Implementado |
| RF-16.3 | A interface mobile deve usar virtualização de listas longas para performance | Implementado |

---

## Requisitos Não-Funcionais

### RNF-01 — Segurança

| ID       | Requisito                                                                     | Status       |
| -------- | ----------------------------------------------------------------------------- | ------------ |
| RNF-01.1 | Sessão via cookie HttpOnly — inacessível ao JavaScript do cliente             | Implementado |
| RNF-01.2 | CSRF token duplo em todas as mutações autenticadas                            | Implementado |
| RNF-01.3 | Senhas armazenadas com argon2id                                               | Implementado |
| RNF-01.4 | Rate limit por domínio em Redis para todos os endpoints sensíveis             | Implementado |
| RNF-01.5 | Todos os dados filtrados por workspaceOwnerUserId — zero cross-tenant leakage | Implementado |
| RNF-01.6 | Audit log de eventos críticos de autenticação e operação                      | Implementado |
| RNF-01.7 | Campos sensíveis (senha, token, PIN) redigidos em logs                        | Implementado |

---

### RNF-02 — Performance

| ID       | Requisito                                                                      | Status       |
| -------- | ------------------------------------------------------------------------------ | ------------ |
| RNF-02.1 | Cache Redis com TTL por domínio de dados (finanças, produtos, employees)       | Implementado |
| RNF-02.2 | Snapshot de operações ao vivo com TTL de 30s e patch incremental via Socket.IO | Implementado |
| RNF-02.3 | Consultas críticas com índices compostos no banco (companyOwnerId + openedAt)  | Implementado |
| RNF-02.4 | Virtualização de listas longas no frontend com TanStack Virtual                | Implementado |
| RNF-02.5 | Build com code splitting e lazy loading por rota                               | Implementado |

---

### RNF-03 — Disponibilidade

| ID       | Requisito                                                                        | Status       |
| -------- | -------------------------------------------------------------------------------- | ------------ |
| RNF-03.1 | Health check em `/api/health` com estado de DB e Redis                           | Implementado |
| RNF-03.2 | Degradação graciosa quando Redis está indisponível (sem cache, sistema continua) | Implementado |
| RNF-03.3 | Deploy contínuo via Railway com zero downtime                                    | Implementado |

---

### RNF-04 — Qualidade de código

| ID       | Requisito                                                          | Status       |
| -------- | ------------------------------------------------------------------ | ------------ |
| RNF-04.1 | CI obrigatório: lint + typecheck + testes + security audit + build | Implementado |
| RNF-04.2 | 53+ testes unitários e de integração no backend                    | Implementado |
| RNF-04.3 | Testes E2E com Playwright no frontend                              | Implementado |
| RNF-04.4 | Load tests com K6 para endpoints críticos                          | Implementado |

---

### RNF-05 — Conformidade e privacidade

| ID       | Requisito                                                    | Status       |
| -------- | ------------------------------------------------------------ | ------------ |
| RNF-05.1 | Conformidade com LGPD — consentimento explícito e versionado | Implementado |
| RNF-05.2 | Dados de cada negócio completamente isolados por workspace   | Implementado |
| RNF-05.3 | Nenhum dado sensível em localStorage (apenas estado de UI)   | Implementado |

---

### RNF-06 — Observabilidade

| ID       | Requisito                                         | Status       |
| -------- | ------------------------------------------------- | ------------ |
| RNF-06.1 | Logging estruturado com request-id por requisição | Implementado |
| RNF-06.2 | Monitoramento de erros/traces com stack OSS       | Implementado |

---

## Restrições conhecidas

1. **Observabilidade OSS** ainda está em rollout progressivo entre ambientes.
2. **Service Worker** está limitado ao módulo `/app` — não cobre todas as rotas.
3. **Cobertura frontend** é parcial — os testes cobrem os módulos críticos mas não toda a superfície.
