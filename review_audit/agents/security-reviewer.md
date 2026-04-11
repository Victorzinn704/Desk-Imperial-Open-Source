# Security Review - `desk-imperial`

Escopo: AppSec e privacidade em todo o repositório. Auditoria evidence-first, sem alteração de código de produção.

## Resumo do domínio

O repositório mostra uma base razoavelmente bem endurecida em autenticação, cookies, CORS e headers: há `SessionGuard`, cookies `HttpOnly`/`Secure`, validação de ambiente, `helmet`, `throttling`, allowlist de origens e testes automatizados para guardas críticas. O risco residual mais relevante não é um bypass amplo de autenticação, e sim falhas pontuais com impacto prático em superfícies sensíveis: CSRF por validação de `Referer` fraca, vazamento de dados sensíveis em logs, modo de email por log com códigos OTP expostos e dependências de produção com CVEs conhecidas.

## Principais riscos

1. Bypass parcial da defesa CSRF quando `Origin` falta e `Referer` é aceito por prefixo.
2. Vazamento de dados sensíveis em logs estruturados por lacuna de redaction para `buyerDocument`.
3. Exposição de códigos de verificação e reset em modo de email por log, inclusive com fallback configurável sem bloqueio explícito em produção.
4. Supply chain em risco: `npm audit --omit=dev` apontou 8 vulnerabilidades em dependências de produção, incluindo `next`, `nodemailer`, `lodash` e `path-to-regexp`.

## Achados detalhados

### 1) Validação de `Referer` em CSRF usa comparação por prefixo

- Status: **Fato confirmado**
- Severidade: **Média**
- Impacto: a proteção de CSRF perde robustez quando `Origin` está ausente; um `Referer` malicioso que apenas comece com a origem permitida passa na allowlist. Isso enfraquece a defesa para rotas state-changing, especialmente se houver cenários de navegador/cliente que omitirem `Origin`.
- Confiança: **Alta** quanto ao bug; **Média** quanto à explorabilidade prática total, porque o token CSRF ainda é exigido e o impacto depende do fluxo de requisição.
- Evidência:
  - [`apps/api/src/modules/auth/guards/csrf.guard.ts`](C:\Users\Desktop\Documents\desk-imperial\apps\api\src\modules\auth\guards\csrf.guard.ts#L41-L52)
  - [`apps/api/test/csrf.guard.spec.ts`](C:\Users\Desktop\Documents\desk-imperial\apps\api\test\csrf.guard.spec.ts#L93-L108)
- Leitura:
  - O guard aceita `Origin` apenas se estiver na allowlist.
  - Quando `Origin` está ausente, ele valida `Referer` com `startsWith(allowedOrigin)`, o que é prefix-matching e não correspondência de origem.
  - Os testes cobrem um `Referer` permitido, mas não um caso malicioso como `https://app.exemplo.com.evil.com/...`.
- Recomendação concreta:
  - Trocar a validação por parsing de origem real e comparação exata com `normalizeOrigin(...)`.
  - Rejeitar `Referer` ausente em rotas state-changing, salvo exceção muito bem justificada.
  - Adicionar teste negativo para prefix-smuggling de `Referer`.

### 2) Dependências de produção com vulnerabilidades conhecidas

- Status: **Fato confirmado**
- Severidade: **Alta**
- Impacto: superfície de DoS e possível injection/prototype pollution em runtime, dependendo do caminho atingido. Mesmo sem exploração confirmada nesta revisão, o risco já está materializado no lockfile de produção.
- Confiança: **Alta**
- Evidência:
  - [`apps/api/package.json`](C:\Users\Desktop\Documents\desk-imperial\apps\api\package.json#L20-L56)
  - [`apps/web/package.json`](C:\Users\Desktop\Documents\desk-imperial\apps\web\package.json#L20-L47)
  - [`package-lock.json`](C:\Users\Desktop\Documents\desk-imperial\package-lock.json#L14761-L14770)
  - [`package-lock.json`](C:\Users\Desktop\Documents\desk-imperial\package-lock.json#L14935-L14938)
  - `npm audit --omit=dev --json` retornou 8 vulnerabilidades em produção: 7 high, 1 moderate.
- Leitura:
  - `next` está resolvido em `16.1.7`, enquanto o audit reporta DoS em Server Components para a faixa `<16.2.3`.
  - `nodemailer` está em `8.0.4`, faixa afetada por injection via `name` do transporte.
  - `@nestjs/config` e `@nestjs/swagger` herdam `lodash` vulnerável.
  - `@nestjs/core`, `@nestjs/platform-express` e `@nestjs/swagger` herdam `path-to-regexp` vulnerável.
- Recomendação concreta:
  - Atualizar as dependências afetadas para faixas corrigidas.
  - Reexecutar `npm audit --omit=dev` e a suíte de teste crítica após o bump.
  - Priorizar `next` e `nodemailer` por estarem em superfície de runtime direta.

### 3) Redaction de logs não cobre `buyerDocument`

- Status: **Fato confirmado**
- Severidade: **Média**
- Impacto: CPF/CNPJ ou outro documento do comprador pode ir para logs estruturados da API, ampliando exposição de dados pessoais e risco LGPD/privacy em observabilidade, SIEM e retenção de logs.
- Confiança: **Alta**
- Evidência:
  - [`apps/api/src/app.module.ts`](C:\Users\Desktop\Documents\desk-imperial\apps\api\src\app.module.ts#L79-L118)
  - [`apps/api/src/modules/orders/dto/create-order.dto.ts`](C:\Users\Desktop\Documents\desk-imperial\apps\api\src\modules\orders\dto\create-order.dto.ts#L37-L63)
- Leitura:
  - O logger redige `customerDocument`, `document`, `cpf` e `cnpj`.
  - O DTO real do pedido usa `buyerDocument`, e esse nome não aparece na lista de redaction.
  - Se a requisição do pedido for logada em nível de corpo, o valor pode ficar exposto.
- Recomendação concreta:
  - Adicionar `req.body.buyerDocument` à redaction.
  - Rever aliases semelhantes em DTOs, validações e logs para cobrir variações de nome.
  - Considerar política de minimização: evitar persistir documento completo em logs quando não for estritamente necessário.

### 4) Códigos OTP são logados em modo de email por log

- Status: **Fato confirmado**
- Severidade: **Média**
- Impacto: códigos de redefinição e verificação podem aparecer em logs quando o modo `log` é usado; em produção, uma configuração incorreta poderia expor OTPs a operadores, agregadores e ferramentas de observabilidade.
- Confiança: **Alta** quanto ao comportamento do código; **Média** quanto ao risco de produção, porque depende de configuração.
- Evidência:
  - [`apps/api/src/modules/mailer/mailer.service.ts`](C:\Users\Desktop\Documents\desk-imperial\apps\api\src\modules\mailer\mailer.service.ts#L35-L70)
  - [`apps/api/src/modules/mailer/mailer.service.ts`](C:\Users\Desktop\Documents\desk-imperial\apps\api\src\modules\mailer\mailer.service.ts#L174-L193)
  - [`apps/api/src/config/env.validation.ts`](C:\Users\Desktop\Documents\desk-imperial\apps\api\src\config\env.validation.ts#L28-L51)
  - [`apps/api/test/mailer.service.spec.ts`](C:\Users\Desktop\Documents\desk-imperial\apps\api\test\mailer.service.spec.ts#L46-L71)
- Leitura:
  - `sendPasswordResetEmail` e `sendEmailVerificationEmail` embutem o código real na mensagem de fallback.
  - `sendTransactionalEmail` escreve essa mensagem com `logger.warn` quando o modo efetivo é `log`.
  - O ambiente é validado para segredos, mas não há bloqueio explícito para `EMAIL_PROVIDER=log` em produção.
  - Os testes mostram que o modo `log` é intencional em não-produção, o que reforça a necessidade de impedir esse modo em produção.
- Recomendação concreta:
  - Bloquear `EMAIL_PROVIDER=log` em produção via validação de ambiente ou bootstrap.
  - Eliminar OTPs da mensagem de log, ou substituir por um identificador opaco sem valor reutilizável.
  - Registrar apenas metadados mínimos quando o fallback for inevitável.

## Notas de hardening e superfícies de exposição

- `apps/api/src/main.ts` mostra boas bases: `helmet`, HSTS em produção, `x-powered-by` desativado, CORS com allowlist e cookies com segredos obrigatórios. Isso reduz o risco de CORS aberto, clickjacking e sessão sem proteção.
- `apps/web/next.config.ts` aplica headers de segurança no frontend, mas a CSP ainda mantém `'unsafe-inline'` em `script-src` e `style-src`. Não confirmei um sink explorável de XSS nesta auditoria, então tratei isso como hardening residual, não como vulnerabilidade confirmada.
- O backend expõe IP e user-agent em trilhas de auditoria e feed de atividade; isso parece funcionalmente intencional, mas deve ser tratado como dado pessoal sob LGPD com retenção e finalidade documentadas.

## Resultado dos testes e verificação

- Testes executados com sucesso:
  - `csrf.guard.spec.ts`
  - `session.guard.spec.ts`
  - `admin-pin.guard.spec.ts`
  - `auth.service.spec.ts`
- Cobertura observada:
  - Guardas críticas têm testes, mas o caso negativo de `Referer` por prefixo não está coberto.
- Arquivos verificados adicionalmente:
  - CI, Docker, `.env.example`, `next.config.ts`, módulos de auth, mailer, audit/logging e packages principais.

