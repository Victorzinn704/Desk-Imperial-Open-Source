# Product Image Quality Audit

Data: 2026-05-04

## Resultado Local

Auditoria executada contra o banco local com `node scripts/audit-product-images.mjs`.

- Total auditado: 20 produtos.
- Fotos reais persistidas: 0.
- Produtos embalados sem foto real: 15.
- Produtos sem foto: 5.

Exemplos críticos: Antarctica, Brahma, Budweiser, Corona, Heineken, Spaten, Stella Artois, Coca-Cola, Guaraná e Água Mineral.

## Diagnóstico

O Gemini não é a fonte das imagens atuais. Ele está no fluxo de rascunho inteligente de cadastro, gerando texto estruturado. As imagens vêm de:

- `imageUrl` salvo no produto, quando existe.
- OpenFoodFacts no lookup por código de barras.
- Pexels para sugestões ilustrativas.
- Fallback visual do front para produtos sem foto.

No estado atual, os produtos de teste não têm `imageUrl`; portanto o PDV cai no fallback visual. Para produto embalado, fallback genérico parece foto errada e reduz confiança operacional.

## Padrão Decidido

- Produto embalado precisa de foto real da embalagem ou estado explícito `sem foto`.
- Pexels só deve ser usado para comida preparada, combos e contexto ilustrativo, não para lata, garrafa, cerveja ou refrigerante.
- O front não deve apresentar fallback como se fosse imagem real de produto.
- A imagem que já está em produção ou salva em `Product.imageUrl` é a fonte canônica; resolver visual não pode trocar por packshot local, SVG ou foto genérica.
- Gemini/LangChain devem entrar como verificador semântico de candidatos, não como fonte única de imagem.

## Estado Implementado

- PDV e portfólio tentam imagem real por EAN/Open Food Facts quando há barcode.
- Bebida embalada sem imagem real não consulta Pexels automaticamente.
- O fallback SVG/packshot local foi removido da apresentação do catálogo.
- Produto sem foto renderiza iniciais explícitas, sem fingir imagem real.

## Atualizacao 2026-05-08 — Cadeia Por EAN

O lookup por codigo de barras passou a seguir uma cadeia de provedores server-side, com cache em memoria e sem gerar imagem falsa:

1. `EANPictures`: primeira tentativa para produtos brasileiros embalados.
2. `OpenFoodFacts`: fallback global quando o EAN nacional nao retorna dados suficientes.
3. Estado explicito sem foto: se nenhum provedor trouxer imagem real, o front renderiza placeholder textual.

Rotas atuais:

- `POST /api/barcode/lookup`: consulta dados normalizados do produto autenticado.
- `GET /api/barcode/image/eanpictures/:barcode`: proxy server-side para a imagem real da EANPictures.

Regras de implementacao:

- o navegador nunca chama EANPictures direto; a rota interna evita CORS e padroniza cache;
- resposta de imagem so e aceita quando `Content-Type` comeca com `image/`;
- imagens internas `/api/barcode/image/...` sao tratadas como fonte confiavel pelo `ProductThumb`;
- produto embalado sem match nao pode cair em Pexels ou packshot inventado.

Como testar manualmente:

```powershell
Invoke-WebRequest -UseBasicParsing "http://localhost:3000/api/barcode/image/eanpictures/7894900010015"
```

No app, use o leitor/cadastro rapido do owner ou o cadastro de produto com EAN real e confira se `imageUrl` veio da rota interna ou do OpenFoodFacts. Se vier `null`, o comportamento esperado e placeholder claro, nao imagem generica.

## Próxima Implementação

1. Backfill por código de barras/OpenFoodFacts para produtos embalados.
2. Fila de revisão manual para itens sem EAN ou sem match confiável.
3. Validador semântico opcional com Gemini via LangChain, recebendo `{nome, marca, categoria, embalagem, candidatoImagem}` e retornando `approved | rejected | needs_review`.
4. Persistir somente imagem aprovada em `Product.imageUrl` com `catalogSource` claro.
5. Rodar `node scripts/audit-product-images.mjs` antes de liberar mudanças de catálogo.

## Comando

```powershell
node scripts/audit-product-images.mjs
node scripts/audit-product-images.mjs --json
```
