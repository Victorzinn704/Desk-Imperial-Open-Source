# Git Sem Drama: Guia Profissional De Versionamento

> Um guia pratico para usar Git como ferramenta de engenharia, nao como botao de salvar.

## Para Quem E Este Guia

Este guia e para quem ja abriu terminal, ja viu `git status`, mas ainda sente inseguranca antes de commitar, resolver conflito, limpar worktree ou investigar quando um bug entrou no projeto.

O objetivo nao e decorar comando. O objetivo e entender o fluxo mental:

- o que mudou;
- por que mudou;
- como provar que esta certo;
- como voltar atras sem destruir trabalho;
- como deixar outro dev entender sua decisao.

Git bom nao e Git complicado. Git bom e previsivel.

## Modelo Mental

Pense no Git como quatro areas:

```text
Working tree  -> arquivos editados na pasta
Staging area  -> o que vai entrar no proximo commit
Commit        -> snapshot versionado com mensagem
Remote        -> copia compartilhada no GitHub/GitLab/Bitbucket
```

O erro comum de junior e tratar Git como backup. Git e registro de decisao. Um commit deve contar uma pequena historia tecnica.

### Regra Central

Antes de qualquer comando de risco, rode:

```bash
git status
```

Antes de qualquer commit, rode:

```bash
git diff
git diff --staged
```

Se voce nao sabe explicar o diff, ainda nao esta pronto para commitar.

## Configuracao Inicial

Configure identidade:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

Configure branch padrao:

```bash
git config --global init.defaultBranch main
```

Configure editor:

```bash
git config --global core.editor "code --wait"
```

Verifique:

```bash
git config --global --list
```

## Comandos Essenciais

### Ver Estado

```bash
git status
```

Mostra arquivos modificados, staged, untracked e branch atual.

```bash
git diff
```

Mostra mudancas ainda nao staged.

```bash
git diff --staged
```

Mostra o que esta pronto para entrar no commit.

```bash
git log --oneline --decorate --graph --all -20
```

Mostra historico recente de forma visual.

### Adicionar Mudancas

```bash
git add caminho/do/arquivo.ts
```

Adiciona arquivo especifico.

```bash
git add -p
```

Adiciona por partes. Esse e um dos comandos que separa dev cuidadoso de dev apressado.

### Criar Commit

```bash
git commit -m "refactor(api): simplify payment webhook flow"
```

Uma boa mensagem diz:

- area afetada;
- tipo da mudanca;
- intencao.

Formato recomendado:

```text
tipo(escopo): acao objetiva
```

Exemplos:

```text
fix(auth): reject expired sessions before workspace lookup
refactor(pdv): split board query model from component view
docs(ops): document MacBook remote workstation setup
test(payments): cover point webhook idempotency
```

### Enviar E Receber

```bash
git fetch origin
```

Busca historico remoto sem alterar sua branch.

```bash
git pull --rebase
```

Atualiza sua branch mantendo historico linear.

```bash
git push origin minha-branch
```

Envia sua branch.

## Branches

Branch e uma linha de trabalho isolada.

Criar e trocar:

```bash
git switch -c feature/pdv-camera-barcode
```

Trocar para branch existente:

```bash
git switch main
```

Listar:

```bash
git branch
git branch -a
```

Apagar local:

```bash
git branch -d feature/minha-branch
```

Apagar remoto:

```bash
git push origin --delete feature/minha-branch
```

### Nome De Branch

Use nome que revele intencao:

```text
fix/telegram-webhook-timeout
refactor/operations-realtime-cache
docs/code-health-guide
feature/point-payment-intent
```

Evite:

```text
ajustes
teste
final
coisas
arrumando
```

## Fluxo Profissional De Trabalho

Um fluxo saudavel:

```text
1. Entender problema
2. Criar branch pequena
3. Alterar com escopo claro
4. Rodar validacoes locais
5. Revisar diff
6. Commitar
7. Push
8. Abrir PR
9. Aguardar CI
10. Corrigir com commits pequenos
```

Exemplo:

```bash
git switch main
git fetch origin
git pull --rebase
git switch -c fix/pwa-touch-scroll

# editar arquivos

git status
git diff
npm --workspace @partner/web run typecheck
npm --workspace @partner/web run lint
npm --workspace @partner/web run test -- components/owner-mobile

git add -p
git commit -m "fix(pwa): stabilize mobile touch scroll"
git push origin fix/pwa-touch-scroll
```

## Worktree Limpo

Worktree limpo significa:

```bash
git status
```

retorna:

```text
nothing to commit, working tree clean
```

Mas em projeto real, o worktree muitas vezes tem alteracoes suas, alteracoes de outro agente, arquivos gerados e lixo temporario.

### Diagnostico

```bash
git status --short
```

Legenda comum:

```text
 M arquivo.ts    modificado
A  arquivo.ts    adicionado no stage
?? arquivo.ts    untracked
D  arquivo.ts    deletado
UU arquivo.ts    conflito
```

### Limpar Com Seguranca

Primeiro veja o que seria removido:

```bash
git clean -nd
```

Depois, se tiver certeza:

```bash
git clean -fd
```

Nunca rode `git clean -fdx` sem entender. Ele remove tambem arquivos ignorados, como caches e builds.

### Descartar Mudanca Sua

Arquivo especifico:

```bash
git restore caminho/do/arquivo.ts
```

Staged para unstaged:

```bash
git restore --staged caminho/do/arquivo.ts
```

### Quando Nao Descartar

Nao descarte mudanca que voce nao entende. Em time, pode ser trabalho de outro dev ou agente. Primeiro rode:

```bash
git diff caminho/do/arquivo.ts
```

Se a mudanca parece fora do seu escopo, pergunte ou separe em outro commit.

## Stash

Stash guarda mudancas temporariamente.

```bash
git stash push -m "wip: investigando bug do pdv"
```

Listar:

```bash
git stash list
```

Aplicar:

```bash
git stash pop
```

Ver conteudo:

```bash
git stash show -p stash@{0}
```

Use stash para troca rapida de contexto. Nao use como gaveta permanente.

## Rebase Sem Medo

Rebase reaplica seus commits sobre uma base mais nova.

```bash
git fetch origin
git rebase origin/main
```

Se der conflito:

```bash
git status
# resolver arquivos
git add arquivo-resolvido.ts
git rebase --continue
```

Cancelar:

```bash
git rebase --abort
```

Regra: rebase e normal antes do PR. Evite rebase em branch compartilhada sem alinhar com o time.

## Merge

Merge junta historicos.

```bash
git merge feature/minha-branch
```

Use merge quando preservar contexto de branch importa, principalmente em releases longas.

Para feature pequena, rebase costuma deixar historico mais simples.

## Conflitos

Conflito nao e erro. E o Git dizendo: "duas pessoas mudaram o mesmo trecho e eu nao sei qual decisao e correta".

Arquivo em conflito:

```text
[lado atual]
codigo atual
[lado recebido]
codigo vindo da outra branch
[fim do conflito]
```

Fluxo:

```text
1. Leia os dois lados
2. Entenda a regra de negocio
3. Edite para o resultado correto
4. Rode teste
5. git add arquivo
6. continue merge/rebase
```

Nunca resolva conflito escolhendo "aceitar tudo meu" ou "aceitar tudo deles" sem entender contrato, teste e comportamento.

## Debug Com Git

### Quem Mudou Esta Linha?

```bash
git blame caminho/do/arquivo.ts
```

Use para contexto, nao para culpar pessoa. O objetivo e achar decisao.

### Quando O Bug Entrou?

```bash
git log -- caminho/do/arquivo.ts
```

### Ver Um Commit

```bash
git show <hash>
```

### Bisect

`git bisect` encontra o commit que introduziu bug.

```bash
git bisect start
git bisect bad
git bisect good <hash-antigo-bom>
```

A cada passo:

```bash
# rode teste manual ou automatizado
git bisect good
# ou
git bisect bad
```

Final:

```bash
git bisect reset
```

Esse comando transforma "acho que quebrou ontem" em evidencia.

## Tags E Releases

Tag marca versao.

```bash
git tag v1.4.0
git push origin v1.4.0
```

Tag anotada:

```bash
git tag -a v1.4.0 -m "release: v1.4.0"
```

Use tag quando existe pacote, deploy, marco de produto ou rollback possivel.

## Hotfix

Fluxo recomendado:

```text
1. Criar branch a partir da release/main correta
2. Corrigir o minimo
3. Testar fluxo critico
4. Commit claro
5. PR emergencial
6. Deploy
7. Postmortem curto
```

Exemplo:

```bash
git switch main
git pull --rebase
git switch -c hotfix/payment-webhook-signature
```

Hotfix nao e hora de refatorar metade do sistema.

## Pull Request

PR bom responde:

- qual problema foi resolvido;
- qual abordagem foi usada;
- quais riscos existem;
- como foi testado;
- o que ficou fora.

Template simples:

```md
## O que mudou

- ...

## Por que

- ...

## Como testei

- `npm run typecheck`
- `npm --workspace @partner/api run test -- ...`

## Riscos

- ...

## Fora do escopo

- ...
```

## CI Verde

CI verde significa que o projeto passou pelos portoes automatizados.

Em geral:

```text
lint -> estilo e regras
typecheck -> contrato de tipos
test -> comportamento
build -> empacotamento
security -> segredos/dependencias/SAST
quality -> duplicacao/complexidade/dead code
```

Se o CI falhar, nao chute. Abra o log, ache o primeiro erro real e reproduza localmente.

## Comandos De Recuperacao

### Voltar Um Arquivo

```bash
git restore caminho/do/arquivo.ts
```

### Voltar Um Commit Com Novo Commit

```bash
git revert <hash>
```

Use em branch compartilhada. E seguro porque preserva historico.

### Reset Local

```bash
git reset --soft HEAD~1
```

Remove o commit, mantem mudancas staged.

```bash
git reset --mixed HEAD~1
```

Remove o commit, mantem mudancas unstaged.

```bash
git reset --hard HEAD~1
```

Remove commit e mudancas. Perigoso. Use so se tiver certeza.

## Segurança No Git

Nunca commite:

- `.env`;
- token;
- chave privada;
- certificado privado;
- dump de banco;
- log com cookie/JWT;
- dados pessoais reais;
- backup de producao.

Antes de push:

```bash
git diff --cached
```

Use scanners:

```bash
gitleaks protect --staged
```

Se segredo vazou, apagar commit nao basta. Tem que rotacionar o segredo.

## Checklist Antes Do Commit

```text
[ ] git status entendido
[ ] diff revisado
[ ] commit tem escopo unico
[ ] testes relevantes rodaram
[ ] sem segredo
[ ] sem arquivo gerado desnecessario
[ ] mensagem explica intencao
[ ] documentacao atualizada se mudou contrato/processo
```

## Checklist Antes Do Push

```text
[ ] branch atual correta
[ ] rebase/pull feito
[ ] CI local minimo passou
[ ] PR descreve risco e teste
[ ] nenhum arquivo temporario
```

## Receitas Rapidas

Ver arquivos mudados:

```bash
git status --short
```

Ver diff resumido:

```bash
git diff --stat
```

Ver commits locais ainda nao enviados:

```bash
git log origin/main..HEAD --oneline
```

Ver commits remotos que voce ainda nao tem:

```bash
git log HEAD..origin/main --oneline
```

Criar patch:

```bash
git diff > minha-mudanca.patch
```

Aplicar patch:

```bash
git apply minha-mudanca.patch
```

## O Que Um Senior Espera De Um Junior

Um junior forte nao sabe todos os comandos. Ele sabe operar com cuidado:

- pergunta antes de apagar;
- entende diff antes de commitar;
- nao mistura feature, refactor e formatacao no mesmo commit;
- prova com teste;
- documenta decisao;
- nao culpa ferramenta quando o fluxo esta confuso.

Git e uma ferramenta de confiabilidade. Use Git para reduzir medo, nao para criar caos.
