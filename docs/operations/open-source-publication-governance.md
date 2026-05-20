# Governanca de Publicacao Open Source

**Estado:** canonico
**Fonte de verdade privada:** `Victorzinn704/DESK-IMPERIAL`
**Repositorio publico:** `Victorzinn704/Desk-Imperial-Open-Source`

## Objetivo

Publicar uma versao aberta, honesta e tecnicamente madura do Desk Imperial sem expor o produto real, a infraestrutura operacional, dados sensiveis ou historico interno que possa aumentar risco de ataque.

O open source deve provar maturidade tecnica, mas nao precisa revelar a topologia real de producao.

## Principios

1. **Codigo publicavel, operacao protegida**
   O codigo de produto, contratos, testes, docs de arquitetura e runbooks genericos podem ser publicados. Topologia real, acesso remoto, inventario de maquinas, chaves, rotas internas e detalhes de deploy real ficam privados.

2. **Snapshot sanitizada, nao merge direto**
   O publico recebe uma arvore sanitizada gerada por `scripts/prepare-open-source-snapshot.mjs`. Nao se mistura historico privado com o publico.

3. **Sem drift de narrativa**
   README, docs, curriculo e GitHub profile devem contar a mesma historia: o projeto existe, roda, tem qualidade e tem limites conhecidos.

4. **Screenshots so com massa demo**
   Imagem publica precisa ser revisada como documento de seguranca. Uma screenshot pode vazar mais contexto que um arquivo de codigo.

5. **CI publico como evidencia**
   O CI publico precisa continuar verde nos jobs executaveis. Jobs opcionais, como SonarQube sem secrets publicos, podem ficar `skipped`, mas nao devem ser descritos como executados.

## Fluxo obrigatorio antes de publicar

Execute no repositorio privado:

```powershell
npm run repo:open-source:review
npm run repo:open-source:prepare
```

Depois revise o relatorio:

```powershell
Get-Content docs/operations/open-source-full-sync-audit.md
```

Bloqueie a publicacao se aparecer:

- achado bloqueante maior que zero;
- arquivo de `infra/oracle/**`;
- inventario real de VM;
- runbook real de acesso remoto;
- token, chave, webhook secret ou DSN;
- screenshot com dado real;
- documento antigo contradizendo o estado atual.

## Checklist de revisao manual

- [ ] README publico esta alinhado ao estado real do produto.
- [ ] Screenshots estao em `docs/assets/screenshots/` e usam massa demo.
- [ ] `docs/assets/screenshots/README.md` foi atualizado quando uma imagem nova entrou.
- [ ] `docs/INDEX.md` aponta para docs canonicas.
- [ ] `docs/current-state.md` nao promete funcionalidade inexistente.
- [ ] `.env.example` contem apenas placeholders.
- [ ] `open-source-full-sync-audit.md` tem zero achados bloqueantes.
- [ ] `repo:scan-public` passou.
- [ ] `lint:secrets` passou.
- [ ] `quality:contracts` passou.
- [ ] PR publico foi revisado antes do merge.

## O que deve permanecer privado

| Categoria                                             | Motivo                                                |
| ----------------------------------------------------- | ----------------------------------------------------- |
| Topologia Oracle/VMs                                  | Reduz superficie de ataque                            |
| Scripts reais de deploy Oracle                        | Contem caminho operacional e pressupostos de ambiente |
| Tailscale/SSH/workstation                             | Expoe modelo de acesso pessoal                        |
| Inventario de maquinas                                | Ajuda fingerprinting de infraestrutura                |
| Auditorias internas geradas                           | Podem conter achados historicos e contexto sensivel   |
| Prints de provedor, CI privado e observabilidade real | Podem vazar nomes, IDs, hosts ou incidentes           |

## Como abrir mais sem abrir risco

Quando um documento real for util para a comunidade, crie uma versao publica:

- troque IPs e hostnames por placeholders;
- remova nomes de usuario reais;
- remova caminhos remotos sensiveis;
- substitua secrets por `<PLACEHOLDER>`;
- transforme passos de producao em exemplo local;
- declare explicitamente que e um template.

## Evidencia esperada no PR publico

Todo PR de sincronizacao deve registrar:

- hash privado de origem;
- hash publico publicado;
- contagem de arquivos analisados/publicados/excluidos;
- resultado dos scans locais;
- resultado dos checks do GitHub Actions;
- jobs opcionais pulados e motivo.

## Relacao com CI privado

O CI privado valida a fonte real. O CI publico valida a snapshot sanitizada. Os dois precisam ficar saudaveis, mas nao medem a mesma coisa:

- privado: producao, operacao real, infra, deploy e integrações completas;
- publico: codigo publicavel, contratos, testes, segurança de publicacao e qualidade de engenharia.
