# Riscos e Limitações — Desk Imperial

**Versão:** 1.0  
**Última atualização:** 2026-04-01  
**Honestidade:** este documento não suaviza os problemas reais.

---

## Como ler este documento

Cada item tem:

- **Severidade:** Alta / Média / Baixa
- **Tipo:** Limitação de produto / Débito técnico / Risco operacional / Risco de segurança
- **Status:** Conhecido e aceito / Em correção / Bloqueado / Planejado

---

## Limitações de produto

### L-01 — Importação CSV de produtos desativada

| Campo      | Valor                   |
| ---------- | ----------------------- |
| Severidade | Média                   |
| Tipo       | Limitação de produto    |
| Status     | Bloqueado (intencional) |

O endpoint de importação de produtos via CSV retorna HTTP 410 (Gone). A lógica de parsing e importação existe no service mas o endpoint está desativado no controller.

**Impacto:** quem quer cadastrar muitos produtos precisa fazer um por um pela interface.

**Por que está bloqueado:** o endpoint foi desativado enquanto a lógica de validação e rollback não está robusta o suficiente para produção.

---

### L-02 — Sem integração com plataformas de entrega

| Campo      | Valor                |
| ---------- | -------------------- |
| Severidade | Média                |
| Tipo       | Limitação de produto |
| Status     | Fora do escopo atual |

O sistema não se integra com iFood, Rappi ou outras plataformas de delivery. Os pedidos precisam ser registrados manualmente.

**Impacto:** negócios com alto volume de delivery precisam digitar os pedidos no sistema.

**Decisão:** integração com delivery está fora do escopo da versão atual. O foco é o atendimento presencial.

---

### L-03 — Sem relatórios avançados ou dashboards customizáveis

| Campo      | Valor                |
| ---------- | -------------------- |
| Severidade | Baixa                |
| Tipo       | Limitação de produto |
| Status     | Planejado            |

Os KPIs financeiros são fixos. Não é possível criar relatórios customizados ou exportar dados em formatos além de CSV.

---

### L-04 — Sem suporte a múltiplas unidades no mesmo workspace

| Campo      | Valor                |
| ---------- | -------------------- |
| Severidade | Média                |
| Tipo       | Limitação de produto |
| Status     | Fora do escopo atual |

Cada conta é um workspace independente. Um negócio com duas filiais precisa de duas contas separadas.

---

## Débito técnico

### D-01 — Cobertura de testes frontend parcial

| Campo      | Valor              |
| ---------- | ------------------ |
| Severidade | Média              |
| Tipo       | Débito técnico     |
| Status     | Conhecido e aceito |

O backend tem 53+ testes cobrindo todos os módulos críticos. O frontend tem Playwright E2E e Vitest, mas a cobertura não abrange toda a superfície de componentes de negócio.

**Impacto:** mudanças no frontend podem introduzir regressões que os testes atuais não detectam.

**Mitigação:** os fluxos críticos (login, PDV, financeiro) têm cobertura E2E.

---

### D-02 — Hook de realtime no frontend com múltiplas responsabilidades

| Campo      | Valor          |
| ---------- | -------------- |
| Severidade | Baixa          |
| Tipo       | Débito técnico |
| Status     | Conhecido      |

O hook `use-operations-realtime.ts` concentra lógica de conexão, reconexão, parsing de eventos e atualização de estado. Está funcional mas com custo de manutenção alto.

**Impacto:** alterações no fluxo realtime exigem cuidado neste arquivo.

---

### D-03 — Service Worker limitado ao módulo /app

| Campo      | Valor          |
| ---------- | -------------- |
| Severidade | Baixa          |
| Tipo       | Débito técnico |
| Status     | Conhecido      |

O registro de Service Worker está limitado ao escopo `/app`. Rotas fora desse escopo não têm suporte a cache offline.

**Impacto:** o comportamento offline é inconsistente dependendo da rota.

---

## Riscos operacionais

### O-01 — Sem monitoramento de erros em produção (Sentry)

| Campo      | Valor             |
| ---------- | ----------------- |
| Severidade | Alta              |
| Tipo       | Risco operacional |
| Status     | Planejado         |

O sistema não tem Sentry ou equivalente integrado. Erros em produção são descobertos apenas quando o usuário reporta ou quando o mantenedor checa os logs manualmente.

**Impacto:** erros silenciosos podem passar despercebidos por horas.

**Mitigação atual:** health check em `/api/health`, logging estruturado com request-id, audit log de eventos críticos.

**Plano:** integração com Sentry está no roadmap.

---

### O-02 — Dependência de serviços externos sem fallback completo

| Campo      | Valor                 |
| ---------- | --------------------- |
| Severidade | Média                 |
| Tipo       | Risco operacional     |
| Status     | Parcialmente mitigado |

O sistema depende de serviços externos:

| Serviço           | Uso                 | Fallback                                                |
| ----------------- | ------------------- | ------------------------------------------------------- |
| Neon (PostgreSQL) | Persistência        | Nenhum — banco é crítico                                |
| Redis             | Cache e rate limit  | Graceful degradation — sistema continua sem cache       |
| Brevo             | E-mail transacional | Sem fallback — recuperação de senha e verificação param |
| Gemini            | Insight IA          | Retorna erro controlado — não bloqueia o sistema        |
| AwesomeAPI        | Cotações de moeda   | Valores de fallback configurados no `.env`              |
| Nominatim         | Geocodificação      | Timeout curto, falha não bloqueia cadastro              |

---

### O-03 — Deploy em instância única sem alta disponibilidade

| Campo      | Valor             |
| ---------- | ----------------- |
| Severidade | Média             |
| Tipo       | Risco operacional |
| Status     | Aceito para MVP   |

A infraestrutura atual é uma instância única no Railway. Não há redundância, load balancer ou failover automático.

**Impacto:** uma instabilidade no Railway afeta todos os usuários.

**Mitigação:** Railway tem SLA e restart automático em caso de crash.

---

## Riscos de segurança conhecidos

### S-01 — Sem alertas de segurança automáticos em produção

| Campo      | Valor              |
| ---------- | ------------------ |
| Severidade | Média              |
| Tipo       | Risco de segurança |
| Status     | Planejado          |

Os eventos de segurança (tentativas de login excessivas, falhas de PIN) são registrados no audit log, mas não geram alertas automáticos.

**Impacto:** um ataque em andamento pode não ser detectado rapidamente.

---

### S-02 — Swagger desabilitado em produção mas configurável

| Campo      | Valor              |
| ---------- | ------------------ |
| Severidade | Baixa              |
| Tipo       | Risco de segurança |
| Status     | Controlado         |

O Swagger está desabilitado por padrão em produção (`ENABLE_SWAGGER=false`). Se habilitado acidentalmente em produção, expõe a documentação completa da API.

**Mitigação:** variável de ambiente explícita obrigatória para habilitar.

---

## Débito de documentação

| Item                               | Status    |
| ---------------------------------- | --------- |
| Demo documentado                   | Planejado |
| Roadmap público                    | Criado    |
| Índice de documentação             | Criado    |
| Módulos arquiteturais documentados | Criado    |
| Schema do banco documentado        | Criado    |

---

## Política de atualização deste documento

Este documento deve ser atualizado quando:

- Uma limitação conhecida é resolvida
- Um novo risco é identificado
- O status de um item muda
