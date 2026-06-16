# Public Doc Link Hygiene — 2026-06-16

## Objetivo

Revisar a documentação pública do Desk Imperial para remover links quebrados, caminhos locais e referências diretas a arquivos privados de infraestrutura.

## Escopo

Esta auditoria cobre somente documentação. Nenhum código de produto, workflow, script de deploy ou contrato foi alterado.

## Achados

| Achado                                                                               | Risco                                                                           | Correção aplicada                                                                                 |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Links Markdown apontando para caminhos `C:/Users/Desktop/...`                        | Expõe caminho local e quebra a navegação no GitHub.                             | Convertidos para links relativos quando o arquivo existe no snapshot público.                     |
| Links para `infra/oracle/**`                                                         | O próprio runbook público define essa área como sensível e omitida do snapshot. | Substituídos por referência à governança de publicação open source e ao runbook de sincronização. |
| `docs/INDEX.md` apontando para arquivos inexistentes                                 | Leitor chega em 404 ao seguir fonte canônica.                                   | Índice ajustado para documentos públicos existentes.                                              |
| Artefato `artifacts/quality/tooling-baseline/knip.json` tratado como link versionado | O arquivo é saída local e não está no snapshot público.                         | Convertido para referência textual de artefato gerado localmente.                                 |
| Caminhos locais em texto simples                                                     | Não quebravam link, mas vazavam estrutura da máquina de trabalho.               | Redigidos como referência privada/local não versionada.                                           |

## Validação

Foi executado um scanner local de links relativos em todos os arquivos Markdown do repositório.

Resultado após a correção:

```text
BROKEN_COUNT=0
```

Também foi executada busca textual por padrões de caminho local de Windows e workspace privado.

```text
Windows absolute path
private workspace path
local user directory marker
```

Resultado esperado: nenhuma ocorrência restante em arquivos públicos.

## Fronteira Pública

Arquivos de `infra/oracle/**` continuam fora do snapshot público. Quando um documento precisar falar deles, deve apontar para:

- `docs/operations/open-source-publication-governance.md`
- `docs/operations/open-source-sync-runbook.md`

Essa regra evita dois problemas:

1. link quebrado para arquivo que não existe no repositório público;
2. exposição acidental de topologia, nomes de máquinas, caminhos remotos ou pressupostos operacionais.

## Limite

Esta auditoria não valida se todo documento histórico está conceitualmente atualizado. Ela valida higiene de publicação: links, caminhos locais e fronteira entre conteúdo público e privado.
