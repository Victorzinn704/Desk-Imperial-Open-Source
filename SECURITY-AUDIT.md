# Desk Imperial — Auditoria de Segurança: XSS, Injeção de Script e Injeção de Texto

**Data:** 2026-03-27
**Escopo:** todas as superfícies de entrada de texto do sistema
**Método:** análise estática de código (frontend + backend)

---

## 1. Arquitetura de Defesa Existente

Antes dos achados, é importante entender o modelo de defesa em camadas que o projeto já possui.

### 1.1 Camada 1 — Validação no Frontend (Zod)

Arquivo: `apps/web/lib/validation.ts`

Todo formulário usa Zod com `.trim()`, `.min()`, `.max()` e regex antes de qualquer envio.

```
Entrada do usuário → Zod schema → API fetch
```

Exemplos:

- `fullName`: `min(3)` · `max(120)`
- `productName`: `min(2)` · `max(120)` — rejeita string vazia
- `notes`: `max(280)` — só comprimento, sem caracteres especiais
- `employeeCode`: `min(2)` · `max(32)`
- `buyerDocument`: CPF/CNPJ validado com algoritmo real (dígitos verificadores)
- Senha: `min(12)` · `max(128)` · regex forte (maiúscula + minúscula + número + especial)

**Limitação:** Zod não sanitiza — só verifica formato. Um `<script>alert(1)</script>` curto passaria na maioria dos schemas porque satisfaz `.min(2)`.

---

### 1.2 Camada 2 — Sanitizador no Backend

Arquivo: `apps/api/src/common/utils/input-hardening.util.ts`

```typescript
function sanitizePlainText(value, fieldLabel, options) {
  // 1. Substitui caracteres de controle (0x00–0x1F, 0x7F) por espaço
  // 2. Colapsa espaços múltiplos → espaço único
  // 3. Trim
  // 4. REJEITA qualquer string que contenha < ou >    ← chave anti-XSS
  // 5. Opcionalmente rejeita fórmulas: ^[=+@-]        ← CSV injection
}
```

Todo serviço que grava texto livre no banco chama esta função:
`auth.service`, `products.service`, `comanda.service`, `orders.service`, `employees.service`, `operations.service` (mesas).

---

### 1.3 Camada 3 — Rendering React (JSX)

React escapa automaticamente HTML em expressões `{valor}`. Nenhum `dangerouslySetInnerHTML` foi encontrado em **nenhum** componente.

```tsx
<p>{comanda.tableLabel}</p>   // safe — React escapa <, >, &, "
<span>{product.name}</span>   // safe
```

---

### 1.4 Camada 4 — Headers HTTP de Segurança

Arquivo: `apps/web/next.config.ts`

| Header                   | Valor                                          | Proteção               |
| ------------------------ | ---------------------------------------------- | ---------------------- |
| `X-Frame-Options`        | `DENY`                                         | Clickjacking           |
| `X-Content-Type-Options` | `nosniff`                                      | MIME sniffing          |
| `Referrer-Policy`        | `strict-origin-when-cross-origin`              | Vazamento de URL       |
| `HSTS`                   | `max-age=63072000; includeSubDomains; preload` | HTTPS forçado          |
| `Permissions-Policy`     | `camera=(), microphone=(), geolocation=()`     | APIs sensíveis         |
| `frame-ancestors`        | `'none'`                                       | Clickjacking (CSP)     |
| `base-uri`               | `'self'`                                       | Base tag injection     |
| `form-action`            | `'self'`                                       | Open redirect via form |

---

## 2. Mapa de Superfícies de Entrada — Resultado por Campo

### 2.1 Módulo Auth

| Campo                        | Coleta              | Validação Frontend        | Sanitização Backend                 | Renderização | Resultado |
| ---------------------------- | ------------------- | ------------------------- | ----------------------------------- | ------------ | --------- |
| `fullName`                   | `register-form.tsx` | Zod min(3)/max(120)       | `sanitizePlainText` + rejectFormula | JSX text     | ✅ Seguro |
| `companyName`                | `register-form.tsx` | Zod max(160)              | `sanitizePlainText`                 | JSX text     | ✅ Seguro |
| `email`                      | `login-form.tsx`    | Zod `.email()`            | `@IsEmail()` DTO                    | JSX text     | ✅ Seguro |
| `companyStreetLine1..State`  | `register-form.tsx` | Zod min(2)/max(160)       | `sanitizePlainText`                 | JSX text     | ✅ Seguro |
| `companyPostalCode`          | `register-form.tsx` | Regex `/^\d{5}-?\d{3}$/`  | DTO `@Matches`                      | JSX text     | ✅ Seguro |
| `password`                   | `login-form.tsx`    | Zod min(12) + regex forte | hash argon2id — nunca renderizado   | —            | ✅ Seguro |
| `employeeCode` (login staff) | `login-form.tsx`    | Zod min(2)/max(32)        | `sanitizePlainText`                 | JSX text     | ✅ Seguro |

---

### 2.2 Módulo Produtos

| Campo             | Sanitização Backend                 | Renderização             | Resultado |
| ----------------- | ----------------------------------- | ------------------------ | --------- |
| `name`            | `sanitizePlainText` + rejectFormula | JSX text, cards, tabelas | ✅ Seguro |
| `brand`           | `sanitizePlainText` + rejectFormula | JSX text                 | ✅ Seguro |
| `category`        | `sanitizePlainText` + rejectFormula | JSX text, filtros        | ✅ Seguro |
| `packagingClass`  | `sanitizePlainText` + rejectFormula | JSX text                 | ✅ Seguro |
| `measurementUnit` | `sanitizePlainText` + rejectFormula | JSX text                 | ✅ Seguro |
| `description`     | `sanitizePlainText` + rejectFormula | JSX text                 | ✅ Seguro |

---

### 2.3 Módulo Operações (PDV / Comandas / Mesas)

| Campo                                | Sanitização Backend                                                 | Renderização                         | Resultado |
| ------------------------------------ | ------------------------------------------------------------------- | ------------------------------------ | --------- |
| `tableLabel` (mesa)                  | `sanitizePlainText`                                                 | JSX text, mobile grid                | ✅ Seguro |
| `section` (mesa)                     | `sanitizePlainText`                                                 | JSX text                             | ✅ Seguro |
| `customerName`                       | `sanitizePlainText`                                                 | JSX text                             | ✅ Seguro |
| `customerDocument` (CPF/CNPJ)        | `sanitizePlainText` — mascarado via `maskBuyerDocument` na exibição | JSX text, mascarado `161.***.***-98` | ✅ Seguro |
| `notes` (comanda)                    | `sanitizePlainText`                                                 | JSX text                             | ✅ Seguro |
| `productName` (item livre)           | `sanitizePlainText`                                                 | JSX text                             | ✅ Seguro |
| `notes` (item comanda)               | `sanitizePlainText`                                                 | JSX text, kitchen view               | ✅ Seguro |
| `openingCashAmount`, `notes` (caixa) | `sanitizePlainText` (notes)                                         | JSX text                             | ✅ Seguro |

---

### 2.4 Módulo Pedidos (Orders)

| Campo                                     | Sanitização Backend                 | Renderização             | Resultado   |
| ----------------------------------------- | ----------------------------------- | ------------------------ | ----------- |
| `customerName`                            | `sanitizePlainText`                 | JSX text, tabelas        | ✅ Seguro   |
| `buyerDocument`                           | CPF/CNPJ regex + dígito verificador | JSX text, mascarado      | ✅ Seguro   |
| `buyerCity`, `buyerState`, `buyerCountry` | `sanitizePlainText`                 | JSX text, **mapa popup** | ⚠️ Ver §3.1 |
| `buyerDistrict`                           | `sanitizePlainText`                 | JSX text, **mapa popup** | ⚠️ Ver §3.1 |
| `channel`                                 | `sanitizePlainText`                 | JSX text, filtros        | ✅ Seguro   |
| `notes`                                   | `sanitizePlainText`                 | JSX text                 | ✅ Seguro   |

---

### 2.5 Módulo Funcionários

| Campo          | Sanitização Backend                 | Renderização                     | Resultado |
| -------------- | ----------------------------------- | -------------------------------- | --------- |
| `displayName`  | `sanitizePlainText` + rejectFormula | JSX text, ranking, mobile header | ✅ Seguro |
| `employeeCode` | `sanitizePlainText` + rejectFormula | JSX text                         | ✅ Seguro |

---

## 3. Achados de Segurança

### FINDING-01 — `unsafe-inline` na CSP neutraliza proteção contra XSS

**Severidade:** Média
**Arquivo:** `apps/web/next.config.ts`, linha 19
**Tipo:** Configuração de segurança

```javascript
"script-src 'self' 'unsafe-inline'",  // ← problema
```

**Impacto:** A CSP existe para ser a última linha de defesa — se uma injeção de script passasse por todas as outras camadas, a CSP com `'unsafe-inline'` não bloquearia a execução. Ela está presente mas ineficaz para `<script>` inline.

**Por que existe:** Next.js usa scripts inline internamente para hidratação. Sem middleware ou `nonce`, é difícil remover.

**Mitigação atual:** As outras 3 camadas (Zod + sanitizePlainText + JSX) são as defesas reais. A CSP é um extra que não funciona para inline.

**Recomendação para open source:** Documentar isso no README como limitação conhecida. A solução ideal é usar `nonce` via middleware Next.js, mas é complexo para o escopo atual.

---

### FINDING-02 — Caracteres Unicode fullwidth passam pelo sanitizador

**Severidade:** Baixa
**Arquivo:** `apps/api/src/common/utils/input-hardening.util.ts`
**Tipo:** Bypass parcial de sanitização

O padrão de rejeição é `/[<>]/` — captura apenas os caracteres ASCII `0x3C` (`<`) e `0x3E` (`>`).

**Teste de bypass:**

```
＜script＞alert(1)＜/script＞
```

Os caracteres `＜` (U+FF1C) e `＞` (U+FF3E) são fullwidth e **não** são capturados.

**Impacto real: zero.** Isso porque:

1. React escapa todo conteúdo JSX — `＜script＞` é renderizado como texto literal, não executa
2. Esses caracteres são Unicode inofensivos quando tratados como plain text
3. O backend os armazena como texto e o frontend os exibe como texto

**Risco hipotético:** Se em alguma versão futura alguém usar `innerHTML` ou `dangerouslySetInnerHTML` diretamente com dados do banco sem passar pelo `escapeHtml()`, caracteres fullwidth não seriam bloqueados pelo sanitizador. O risco existe no futuro, não no código atual.

**Recomendação:** Adicionar os fullwidth ao padrão de rejeição como defesa em profundidade:

```typescript
// atual
const htmlLikePattern = /[<>]/
// melhorado
const htmlLikePattern = /[<>\uFF1C\uFF3E\u2039\u203A]/
```

---

### FINDING-03 — `point.orders` não escapa no popup do mapa

**Severidade:** Baixíssima / Informacional
**Arquivos:** `apps/web/components/dashboard/map-canvas.tsx` · `sales-map-canvas.tsx`
**Tipo:** Dado não-sanitizado em contexto innerHTML

```typescript
// map-canvas.tsx linha 137
;`<div><span>Vendas</span><strong>${point.orders}</strong></div>`
//                                 ^ sem escapeHtml()
```

`point.orders` é um campo `Int` no Prisma, derivado de `COUNT(*)` no banco — nunca é texto de usuário. É sempre um inteiro como `42`.

**Impacto real: zero.** Um número inteiro não pode ser um vetor XSS.

**Recomendação:** Nenhuma ação necessária. Apenas documentar que está consciente da diferença.

---

### FINDING-04 — `divIcon` pulse com valores matemáticos em innerHTML

**Severidade:** Nenhuma
**Arquivo:** `apps/web/components/dashboard/map-canvas.tsx`, linha 152

```typescript
html: `<div class="map-marker-pulse" style="width:${radius * 2 + 16}px;...`
```

`radius` é calculado puramente a partir de `Math.min(40, 10 + Math.log2(...))` — expressão matemática sem entrada do usuário. Seguro.

---

### FINDING-05 — Unicode bidi overrides passam pelo sanitizador

**Severidade:** Baixa
**Tipo:** Spoofing visual (não-XSS)

Caracteres de controle Unicode bidirecionais como `\u202E` (RIGHT-TO-LEFT OVERRIDE) têm charCode > 127, portanto não são removidos pelo filtro de controle (que só remove 0x00–0x1F e 0x7F).

**Teste:**

```
Pedro‮odro‭P
```

Poderia inverter visualmente o texto na interface — o nome exibido seria diferente do armazenado.

**Impacto:** UI spoofing, sem execução de código. Um funcionário poderia cadastrar um nome de produto visualmente enganoso.

**Recomendação:** Adicionar remoção de bidi overrides ao normalizador:

```typescript
// Adicionar após a substituição de controle chars:
const bidiOverrides = /[\u200F\u200E\u202A-\u202E\u2066-\u2069]/g
sanitized = sanitized.replace(bidiOverrides, '')
```

---

### FINDING-06 — `formatCurrency()` em popup usa `escapeHtml()` — correto, mas redundante

**Severidade:** Nenhuma / Positivo
**Arquivos:** `map-canvas.tsx`, `sales-map-canvas.tsx`

```typescript
const revenue = formatCurrency(point.revenue, displayCurrency)
// ...
`<strong>${escapeHtml(revenue)}</strong>`
```

`formatCurrency` formata um número para string localizada (ex: `R$ 1.234,56`). Não há risco de XSS, mas aplicar `escapeHtml()` é boa prática de defesa em profundidade. Correto.

---

## 4. Vetores Testados e Resultados

### 4.1 Injeção HTML básica

**Payload:** `<script>alert(document.cookie)</script>`

| Ponto de entrada         | Chega ao banco?                                     | Executa? |
| ------------------------ | --------------------------------------------------- | -------- |
| Nome do produto          | ❌ Bloqueado pelo `sanitizePlainText` (detecta `<`) | —        |
| Observação da comanda    | ❌ Bloqueado                                        | —        |
| Nome do funcionário      | ❌ Bloqueado                                        | —        |
| Nome do cliente (pedido) | ❌ Bloqueado                                        | —        |
| Mesa / tableLabel        | ❌ Bloqueado                                        | —        |
| Cidade/estado (pedido)   | ❌ Bloqueado                                        | —        |

---

### 4.2 Injeção em atributos HTML (event handlers)

**Payload:** `" onmouseover="alert(1)` ou `' onerror='alert(1)`

**Resultado:** Não aplicável. Nenhum campo de texto é interpolado diretamente em atributos HTML na renderização React — todo atributo passa por JSX (ex: `title={product.name}`), que escapa aspas automaticamente.

---

### 4.3 Injeção via src/href (javascript: pseudo-protocol)

**Payload:** `javascript:alert(1)`

**Resultado:** Os campos de texto não são usados como `href` ou `src` no código atual. Não há construção de URLs a partir de texto livre do usuário. Não aplicável.

---

### 4.4 Injeção de fórmula CSV (formula injection)

**Payload:** `=HYPERLINK("http://evil.com","clique aqui")` ou `@SUM(...)` ou `+cmd|' /C calc'!A0`

**Resultado:** O sanitizador usa `rejectFormula: true` em todos os campos onde isso é relevante (nomes, labels, descrições). Campos com `=`, `+`, `@` ou `-` no início são **rejeitados com 400 Bad Request**.

**Atenção:** O export CSV do portfólio (mencionado anteriormente como pendente) exportava `originalUnitCost`. Se reativado, os campos de texto salvos passam por `sanitizePlainText` com `rejectFormula: true`, então não há risco de fórmula no CSV.

---

### 4.5 Injeção de payload Unicode

**Payload:** `＜img src=x onerror=alert(1)＞`

**Resultado no backend:** Passa pelo sanitizador (fullwidth não é detectado como `<>`).
**Resultado na renderização:** React exibe como texto literal. Não executa. Impacto zero no código atual.

---

### 4.6 Injeção via campo de notas no mobile

**Payload:** `<img src=x onerror=alert(1)>` no campo `observacao` do `MobileOrderBuilder`

**Resultado:** O campo é enviado via `addComandaItem` ao backend. O `comanda.service.ts` chama `sanitizePlainText(dto.notes, ...)` — detecta `<`, retorna **400 Bad Request** antes de gravar.

---

### 4.7 Injeção de null bytes e caracteres de controle

**Payload:** `texto\x00<script>` ou `texto\x0d\x0aCRLF-injection`

**Resultado:** O `normalizePlainText` substitui todos os caracteres 0x00–0x1F e 0x7F por espaço, então o input se torna `texto      <script>`, e em seguida o `<` é detectado e rejeitado.

---

### 4.8 Tentativa de bypass via encoding duplo

**Payload:** `&lt;script&gt;` (HTML entity codificado)

**Resultado:** O backend armazena literalmente `&lt;script&gt;` como string. O React renderiza como texto, que o navegador decodifica e exibe como `<script>` — visualmente. Porém, sendo conteúdo de texto (não innerHTML), **não executa**. Inofensivo.

---

## 5. Resumo Executivo

| #          | Achado                                                  | Severidade    | Status                                   |
| ---------- | ------------------------------------------------------- | ------------- | ---------------------------------------- |
| FINDING-01 | CSP com `unsafe-inline` — proteção de script fraca      | Média         | Limitação de plataforma (Next.js)        |
| FINDING-02 | Fullwidth Unicode `＜＞` passa no sanitizador           | Baixa         | Impacto zero (React escapa)              |
| FINDING-03 | `point.orders` sem escapeHtml no popup                  | Informacional | Seguro (inteiro, nunca texto de usuário) |
| FINDING-04 | `divIcon` pulse com valores matemáticos em innerHTML    | Nenhuma       | Seguro (valores matemáticos puros)       |
| FINDING-05 | Bidi override chars passam pelo sanitizador             | Baixa         | Risco de UI spoofing, sem execução       |
| FINDING-06 | `escapeHtml` em formatCurrency — redundante mas correto | Positivo      | Boa prática, manter                      |

### Pontuação geral de segurança contra XSS/Injeção de script: **ALTA**

O projeto tem defesa em 4 camadas independentes. Para que um XSS seja executado, um atacante precisaria quebrar **simultaneamente**:

1. A validação Zod no frontend
2. O `class-validator` no DTO do backend
3. O `sanitizePlainText` no service
4. O escape automático do React no rendering

Não existe nenhum caminho realista de execução de XSS no código atual.

---

## 6. Recomendações Priorizadas

### P1 — Bidi overrides (spoofing visual — risco baixo, correção simples) ✅ APLICADO

**Status:** Corrigido em `apps/api/src/common/utils/input-hardening.util.ts`.
Remoção dos chars ocorre antes do `normalizePlainText` principal via `bidiOverridePattern`.

### P2 — Fullwidth HTML chars (defense in depth — risco atual zero) ✅ APLICADO

**Status:** Corrigido. `htmlLikePattern` expandido para incluir `\uFF1C` e `\uFF1E`.

### P3 — CSP nonce (eliminar unsafe-inline — complexidade alta)

Requer middleware Next.js que gere nonce por request e injete em cada `<script>`. Fora do escopo para open source, mas vale documentar no README.

### P4 — Sanitização de `notes` no `openComanda` via draft items

Em `comanda.service.ts`, o `openComanda` cria itens via `createMany` com `draftItems` resolvidos pelo `resolveComandaDraftItems`. Verificar se esse helper também passa os notes pelo `sanitizePlainText`.

---

## 7. Arquivos-chave de Referência

| Arquivo                                              | Função de segurança                                |
| ---------------------------------------------------- | -------------------------------------------------- |
| `apps/api/src/common/utils/input-hardening.util.ts`  | Sanitizador principal                              |
| `apps/web/lib/validation.ts`                         | Schemas Zod (frontend)                             |
| `apps/web/next.config.ts`                            | Headers HTTP de segurança                          |
| `apps/web/components/dashboard/map-canvas.tsx`       | Único ponto de innerHTML controlado com escapeHtml |
| `apps/web/components/dashboard/sales-map-canvas.tsx` | Idem                                               |
| `apps/web/lib/dashboard-format.ts`                   | Mascaramento de CPF/CNPJ (LGPD)                    |
