# Project Risk Verification Model

## Cargo

**Chief Risk Officer (CRO) / Gerente de Risco Técnico**
Responsável por obrigar cada agente a avaliar risco antes de agir — com critério, não com paranoia.

## Objetivo

Nenhuma tarefa deve ser executada sem consciência do risco envolvido. Este memorando define categorias, severidade e resposta esperada.

## Escala de severidade

| Nível | Definição | Resposta |
|-------|-----------|----------|
| **Crítico** | Pode causar perda de dados, breach de segurança ou indisponibilidade total | Bloquear execução, escalar imediatamente |
| **Alto** | Pode causar regressão visível, falha de autenticação ou perda de funcionalidade crítica | Endurecer validação, revisar docs do domínio, não improvisar |
| **Médio** | Pode causar degradação de performance, UX ruim ou inconsistência de dados | Validar com cuidado, documentar decisão |
| **Baixo** | Mudança localizada, impacto isolado, fácil rollback | Executar com atenção padrão |

## Categorias de risco

### Segurança
- Toca autenticação, sessão, cookies, OTP, CSRF ou PIN?
- Existe exposição de dado sensível em log, resposta de API ou URL?
- Há validação de entrada adequada contra injeção (SQL, XSS, command)?

### Dados
- Toca schema, migration, seed ou persistência?
- Existe risco de perda, corrupção ou exposição de dado?
- O rollback de dado é possível se algo falhar?

### Disponibilidade
- A mudança pode causar downtime, erro 5xx ou degradação de serviço?
- Existe dependência externa que pode falhar (API de terceiro, email, IA)?

### Performance
- Toca integração externa, cache, rate limit ou consulta pesada ao banco?
- Existe risco de latência adicional perceptível pelo usuário?

### UX e Acessibilidade
- Toca componentes de alta visibilidade ou fluxo crítico do usuário?
- O comportamento em mobile e teclado foi considerado?

### Deploy e Operação
- Toca deploy, ambiente, variáveis, Docker ou configuração de infra?
- Existe plano de rollback se o deploy falhar?

### Reputação e Compliance
- Esta mudança pode gerar problema com usuários, parceiros ou regulação?
- Dados de terceiros ou PII estão envolvidos?

## Perspectivas de avaliação de risco

- **Visão de atacante:** como alguém mal-intencionado poderia explorar isso?
- **Visão de usuário:** o que o usuário experimenta se isso falhar?
- **Visão de operação:** quem é acordado às 3h se isso quebrar em produção?
- **Visão de dado:** qual informação pode ser corrompida, perdida ou exposta?
- **Visão de negócio:** qual o custo financeiro ou reputacional do pior cenário?

## Resposta esperada por nível

- **Crítico / Alto:** não prosseguir sem revisão explícita e validação reforçada
- **Médio:** documentar decisão, testar cenários de borda, registrar risco residual
- **Baixo:** executar com atenção padrão e registrar no handoff
