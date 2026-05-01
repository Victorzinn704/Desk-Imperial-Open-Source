# Inteligencia de Catalogo

**Versao:** 1.0  
**Ultima atualizacao:** 2026-05-01  
**Estado:** canonico

## Objetivo

Descrever o fluxo real de cadastro inteligente de produtos no Desk Imperial: barcode lookup, enrichment de catalogo, imagens e rascunho via Gemini.

## TL;DR

- o cadastro rapido parte do frontend owner
- o barcode lookup roda no proprio `apps/web` para proteger sessao e normalizar resposta
- o backend de `products` continua como fonte de verdade para persistencia
- o `smart-draft` usa Gemini com cache, rate limit e auditoria
- imagens de produto passam por catalogo proprio, Open Food Facts, catalogo nacional de bebidas embaladas e Pexels

## Superficies ativas

### Frontend web

- `apps/web/app/design-lab/cadastro-rapido/page.tsx`
- `apps/web/lib/api-misc.ts`
- `apps/web/lib/api-products.ts`
- `apps/web/lib/product-visuals.ts`

### API web auxiliar

- `apps/web/app/api/barcode/lookup/route.ts`
- `apps/web/app/api/media/pexels/search/route.ts`

### Backend Nest

- `apps/api/src/modules/products/products.controller.ts`
- `apps/api/src/modules/products/products-smart-draft.service.ts`
- `apps/api/src/modules/products/products.service.ts`
- `apps/api/src/modules/products/products-catalog.util.ts`

## Fluxo 1 - Lookup por EAN

```text
1. OWNER informa ou escaneia o barcode
2. Web chama POST /app/api/barcode/lookup
3. Route local valida a sessao em /api/v1/auth/me
4. Route consulta Open Food Facts
5. Route tenta enriquecer com catalogo nacional de bebidas embaladas
6. Resposta volta normalizada para o formulario
```

Evidencia principal:

- sessao validada localmente em `apps/web/app/api/barcode/lookup/route.ts`
- consulta externa em `OPEN_FOOD_FACTS_API_URL`
- retorno com `source: open_food_facts | national_beverage_catalog`

Campos retornados hoje:

- `barcode`
- `name`
- `description`
- `brand`
- `category`
- `quantityLabel`
- `measurementUnit`
- `measurementValue`
- `packagingClass`
- `servingSize`
- `imageUrl`
- `source`

## Fluxo 2 - Smart draft via Gemini

```text
1. OWNER envia contexto parcial do produto
2. Web chama POST /api/v1/products/smart-draft
3. Backend normaliza e sanitiza o payload
4. Service consulta Gemini
5. Resultado normalizado volta como suggestion estruturada
6. Response pode entrar em cache para repeticoes equivalentes
```

Evidencia principal:

- endpoint `POST /products/smart-draft` em `apps/api/src/modules/products/products.controller.ts`
- service em `apps/api/src/modules/products/products-smart-draft.service.ts`
- dependencias de runtime:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
  - `GEMINI_TIMEOUT_MS`
  - `GEMINI_CACHE_SECONDS`

Guardrails atuais:

- sanitizacao de texto antes de montar o prompt
- cache por `workspaceOwnerUserId + input normalizado`
- rate limit por usuario/IP via Redis
- audit log para draft gerado e draft servido do cache

## Fluxo 3 - Imagem e visual do produto

Fontes atuais, em ordem pratica:

1. `imageUrl` salva no proprio catalogo
2. catalogo nacional de bebidas embaladas
3. fotos curadas de bebidas embaladas
4. fallback ilustrativo para combos
5. busca manual por Pexels

Evidencia principal:

- resolucao de visual em `apps/web/lib/product-visuals.ts`
- catalogo nacional em `apps/web/lib/brazilian-packaged-beverage-catalog.ts`
- busca Pexels em `apps/web/app/api/media/pexels/search/route.ts`

Regras importantes:

- imagem externa precisa ser HTTPS
- Pexels nao substitui catalogo salvo; ele e opcional no fluxo
- bebidas embaladas tem heuristica propria antes de cair em fallback generico

## Fluxo 4 - Persistencia final

Depois do pre-preenchimento, a persistencia continua no backend de `products`.

Responsabilidades que continuam no Nest:

- validar DTO
- normalizar barcode
- montar metadata de catalogo
- sanitizar `imageUrl`, `quantityLabel`, `catalogSource` e afins
- persistir auditoria e integridade do produto

Evidencia principal:

- `products.service.ts`
- `products.types.ts`
- `products-catalog.util.ts`

## Fontes externas e falhas esperadas

### Open Food Facts

- pode responder `404`
- pode retornar payload incompleto
- pode ficar indisponivel

Resultado esperado no produto:

- o fluxo degrada com mensagem controlada
- o cadastro manual continua possivel

### Gemini

- depende de `GEMINI_API_KEY`
- pode responder timeout ou erro do provedor

Resultado esperado no produto:

- `503` controlado
- nenhuma escrita parcial
- owner ainda consegue salvar manualmente

### Pexels

- depende de `PEXELS_API_KEY`
- se ausente, a rota responde erro controlado

Resultado esperado no produto:

- a busca de imagem falha sem quebrar o cadastro base

## Riscos residuais

- barcode lookup ainda depende de fontes externas publicas
- smart draft ainda e sensivel a qualidade da entrada enviada pelo owner
- a cadeia de imagens ainda mistura catalogo real e assets ilustrativos em alguns casos

## Links cruzados

- [overview do produto](./overview.md)
- [fluxos do usuario](./user-flows.md)
- [modulo products](../architecture/modules.md)
- [requisitos](./requirements.md)
