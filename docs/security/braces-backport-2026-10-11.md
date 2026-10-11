# Backport temporário de braces — 2026-10-11

O tooling usa `braces@3.0.3`, afetado por
[CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
Padrões profundamente aninhados, mesmo abaixo do limite de 10.000 caracteres,
podem esgotar a pilha dos walkers recursivos. Nesta data o advisory não indicava
versão corrigida publicada. O alerta do GitHub e os resultados brutos de npm
continuam visíveis; a versão e o nome do pacote não foram alterados.

## Decisão e validade

Esta é uma revisão técnica automatizada realizada por Codex nesta sessão de
manutenção, dentro do objetivo autorizado pelo usuário. Não representa assinatura
ou aprovação humana específica. Responsabilidade operacional registrada:
`repository maintenance workflow; implemented and technically reviewed by Codex`.

A decisão permite uma mitigação local restrita ao tooling de desenvolvimento,
com provas obrigatórias a cada execução. Expira ao fim de **10/11/2026 em Brasília**,
isto é, **11/11/2026 às 00:00 BRT (03:00 UTC)**.
Não há renovação automática. A data é lida também pelo aplicador de postinstall:
depois da expiração, instalação e gate falham até substituição por versão oficial
corrigida ou nova revisão explícita da solução, dos testes e dos pins.
O acompanhamento da remoção/revisão está na [issue #36](https://github.com/Victorzinn704/Desk-Imperial-Open-Source/issues/36),
que permanece aberta após a integração deste reparo.

O registro executável fica em
[`scripts/security/braces-backport/reviewed-config.json`](../../scripts/security/braces-backport/reviewed-config.json).
Ele fixa hashes do lock revisado, tarball/manifest, patch, árvore original,
árvore corrigida, suíte de comportamento e projeção de segurança do advisory.
Uma instalação observada não atualiza esses valores automaticamente.

## Alteração aplicada

O bundle reproduz somente o delta de runtime do commit
[`d44b9b1`](https://github.com/micromatch/braces/commit/d44b9b1ee12e7804d4232d5a47a4a0c61d2fbefe)
do [PR upstream #87](https://github.com/micromatch/braces/pull/87), sobre os bytes
do tarball oficial 3.0.3. Não incorpora as outras mudanças posteriores à release
presentes no HEAD do PR. Apenas cinco arquivos `lib/*.js` mudam:

- parser limita conjuntamente chaves e parênteses a 100 níveis;
- compile, expand e stringify limitam a profundidade de AST;
- expand interrompe ciclos nas cadeias parent efetivamente percorridas;
- `maxDepth` pode reduzir o limite, mas não elevar o teto de 100.

Todos os dez arquivos originais, incluindo LICENSE, README, index, utils e
package.json, são inventariados e conferidos por hash. A instalação aceita somente
uma cópia integralmente original ou integralmente corrigida. Arquivos extras,
patch parcial, identidade divergente, aliases/cópias inesperados ou escapes por
symlink causam falha. Bundle e fixtures preservam os bytes exatos revisados, sem
conversão de quebras de linha pelo Git; fontes e suíte fixada usam LF. Os assets
fixados são excluídos de formatters; bytes instalados nunca são normalizados para passar.
A licença MIT e os avisos originais estão preservados em `bundle/LICENSE`.

Os pisos diretos de Next (16.4.0), Vitest/coverage-v8 (4.1.11) e PostCSS (8.5.29)
também foram alinhados às versões já resolvidas e revisadas no lock. Essa mudança
edita apenas ranges dos manifests e metadados dos workspaces; não troca entradas
instaladas, tarballs ou integridades. Node 22 ficou explícito no contrato da raiz.

O limite rejeita padrões anteriormente aceitos com mais de 100 níveis. Chamadores
devem tratar as exceções explícitas. A correção não limita a expansão cartesiana
nem promete validar objetos JavaScript arbitrários: por exemplo, `text.value`
contendo arrays profundos não é uma AST textual produzida pelo parser. Essa
limitação não foi reclassificada como correção universal de DoS.

## Instalação e gate

Use **Node 22**, declarado em `engines.node`, `.nvmrc` e CI. Não foi alterada
a instalação global de Node do usuário. Use `npm ci` e gere o Prisma Client antes
de testar a API:

```sh
npm ci
npm --workspace @partner/api run prisma:generate
npm run security:verify-backport -- --mode full
npm run security:braces:test
npm run audit:deps
```

Postinstall aplica o patch apenas à base exata e é idempotente. Em instalação
`--omit=dev`, ausência das cópias exclusivamente dev é permitida, mas não é prova
do gate full. Verificação após instalação/bindings nativos é somente leitura:
não corrige automaticamente uma adulteração encontrada.
O wrapper de prepare mantém Husky nas instalações de desenvolvimento e o dispensa
quando `HUSKY=0` ou quando dependências de desenvolvimento são omitidas.

`audit:deps` preserva stdout/stderr/exit code brutos das auditorias full e runtime,
consulta novamente o advisory oficial e o registry, verifica as cópias físicas,
executa regressões em processo Node 22 isolado e verifica a árvore novamente.
O wrapper falha para erro de rede/formato/processo, mudança não revisada de fonte
ou lock, cadeia high/critical diferente, qualquer high/critical de runtime,
prova ausente, patch alterado, regressão ou expiração. O resultado de sucesso é
`PASS_WITH_VERIFIED_BACKPORT`, separado dos achados brutos.

`security:audit-runtime` executa `npm audit --omit=dev --audit-level=high`
estritamente. O helper amplo de allowlist antigo foi removido. O job obrigatório
**Security Checks** conserva seu nome, executa o wrapper e os testes e publica os
artefatos de auditoria com `always()`. Scanners consultivos existentes continuam
visíveis; o advisory não é ignorado por nome, pacote ou severidade genérica.

## Contagens e evidência

A referência desta rodada é **37 achados brutos, incluindo 17 high na cadeia de
desenvolvimento de braces**, e auditoria runtime sem vulnerabilidades. A mitigação
não transforma essa referência em `npm audit = 0`. Cada execução registra a
contagem atual e a lista exata de findings mitigados, sem remover linhas do JSON
original. Moderates continuam visíveis e abaixo do limiar high já adotado.

O experimento isolado sobre a release executou 778 testes com sucesso em Node
22.23.3. Na matriz de 383 casos, os 108 padrões ordinários tiveram o mesmo
resultado antes/depois; os casos de profundidade/opções incluem rejeições
intencionais, portanto não são apresentados como 383 resultados idênticos.
O módulo de integridade tem 56 testes adversariais, inclusive fixtures reais do
pacote resolve e links internos gerados por Next. Validação do produto e CI
precisa ser consultada no PR desta mudança; resultados locais não são deployment.

## Limites e remoção

O inventário prova pacotes npm identificáveis no lock, workspaces, aliases e
árvores físicas. Não identifica toda possível cópia de código de braces renomeada
como código de aplicação. Fixtures não relacionadas são classificadas sem
interromper a caminhada; uma cópia real extra de braces em build/standalone ainda
bloqueia até ter prova específica. Não há garantia contra escritor concorrente:
use instalação CI exclusiva; interrupção parcial exige recuperação por `npm ci`.

Quando houver release oficial corrigida, revise a alteração e os consumidores,
atualize o lock, remova bundle/postinstall/decisão temporária e volte ao gate bruto
sem a mitigação. Uma alteração no advisory, na versão latest do registry ou na
árvore revisada interrompe a decisão antes da expiração e exige revisão.
