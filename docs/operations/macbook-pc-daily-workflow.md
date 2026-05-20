# Workflow Diario: MacBook + PC Windows

Este runbook define como operar o `desk-imperial` com o MacBook como estacao mobile e o PC Windows como base principal, sem conflito de repositorio, sem drift operacional e sem exposicao publica.

## Estado Validado

Em `2026-05-15`, o fluxo abaixo ficou validado:

- Tailscale ativo no PC e no Mac.
- Host do PC: `desk-imperial-pc`.
- IP Tailscale atual do PC: `<TAILSCALE_PC_IP>`.
- OpenSSH no Windows ativo e aceitando chave do Mac.
- Parsec funcionando para desktop remoto completo.
- Firewall do Windows restringindo SSH a `100.64.0.0/10`.

## Canais Oficiais

Use cada canal para um tipo de trabalho:

- `VS Code Remote SSH`: codigo, git, logs, scripts, testes, leitura e edicao no mesmo workspace do PC.
- `Parsec`: desktop completo, apps graficos, suporte operacional, navegador, Docker Desktop, janelas administrativas e recuperacao rapida.
- `GitHub`: sincronizacao oficial entre PC, Mac e Oracle. Nao usar compartilhamento de pasta como mecanismo de codigo.

## Regra De Ouro

O workspace fonte da verdade continua no PC:

```text
C:\Users\Desktop\Documents\desk-imperial
```

O Mac nao deve criar um clone paralelo desse mesmo fluxo para trabalho normal de backend/web, a menos que o objetivo seja build nativo mobile.

## Fluxo Fixo De Inicio

Antes de comecar a trabalhar no Mac:

1. Abrir Tailscale no Mac e confirmar que `desk-imperial-pc` esta online.
2. Testar SSH:

```bash
ssh desk-imperial
```

3. Se o SSH falhar, abrir Parsec e validar se o PC esta responsivo.
4. Abrir `VS Code Remote SSH` no host `desk-imperial`.
5. Confirmar no terminal remoto:

```powershell
whoami
hostname
git branch --show-current
git status --short
```

Resultado esperado:

- usuario `Desktop`;
- host `<WINDOWS_HOSTNAME>`;
- branch correta;
- worktree entendido antes de qualquer edicao.

## Fluxo Fixo De Trabalho

Para desenvolvimento diario:

1. Preferir `Remote SSH` para editar codigo.
2. Usar `Parsec` quando precisar:
   - de janela completa do Windows;
   - de apps que nao ficam bons por SSH;
   - aceitar UAC;
   - mexer em Tailscale, firewall, OpenSSH ou outro componente administrativo.
3. Antes de alterar arquivos sensiveis, registrar o escopo:
   - qual modulo;
   - quais arquivos;
   - se ha servidor local ligado;
   - se ha mudanca de infra, runtime ou secret.
4. Antes de rodar algo pesado, validar se isso realmente precisa acontecer no PC inteiro.

## Fluxo Fixo Para O Mac Agente

Se um agente rodar no Mac e outro no PC, o agente do Mac deve seguir isto:

1. Nunca assumir que o worktree esta limpo.
2. Ler `git status --short` antes de tocar qualquer arquivo.
3. Informar quais arquivos pretende alterar.
4. Preferir leitura, auditoria e validacao antes de escrita.
5. Nao criar nova chave SSH, novo tunel, nova regra de firewall ou nova branch sem necessidade clara.
6. Nao fazer `git reset --hard`, `git checkout --`, `force-push`, `rebase` ou limpeza destrutiva.
7. Se precisar de elevacao no Windows, usar Parsec e agir no PC conscientemente.

## Quando Usar Clone Separado No Mac

Clone separado no Mac e permitido apenas para:

- Kotlin;
- Flutter;
- iOS;
- Xcode;
- builds mobile locais;
- prototipos nativos que nao dependem do mesmo workspace em execucao no PC.

Nesse caso:

- o clone do Mac e auxiliar;
- o PC continua sendo a base principal do produto;
- sincronizacao entre ambientes acontece por Git, nunca por pasta compartilhada.

## Smoke Test Diario

Antes de uma sessao importante, rode no PC remoto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\audit-remote-workstation.ps1
```

Checklist esperado:

- Tailscale `ready`;
- `sshd` `Running`;
- chave do usuario presente;
- projeto no caminho esperado;
- regras de firewall do SSH visiveis.

No Mac:

```bash
ssh desk-imperial
```

Se ambos passarem, o fluxo operacional esta pronto.

## Fallback E Recuperacao

Se `Remote SSH` cair:

1. testar `ssh desk-imperial` no Terminal;
2. se falhar, abrir Parsec;
3. no PC, rodar a auditoria;
4. se o problema for Tailscale, usar:

```text
scripts/restart-tailscale-admin.cmd
```

5. se o problema for chave SSH administrativa, usar:

```text
scripts/install-mac-admin-ssh-key-admin.cmd
```

6. se o problema for apenas VS Code Remote, reconectar a sessao sem alterar infraestrutura.

## Regras De Seguranca

Permanecem obrigatorias:

- sem porta publica para SSH;
- sem RDP publico;
- sem AnyDesk publico;
- sem tunel publico de conveniencia;
- sem senha como caminho primario do SSH;
- sem secrets no Git;
- sem deploy normal a partir de `working-tree`.

## Decisao Operacional

O fluxo oficial fica assim:

```text
Mac -> Tailscale -> SSH -> VS Code Remote -> workspace do PC
Mac -> Parsec -> desktop completo do PC
Mac local -> clone separado apenas para mobile/nativo
GitHub -> ponte oficial entre ambientes
```

Esse e o workflow fixo. Qualquer mudanca nova deve ser tratada como excecao tecnica, nao como novo padrao.
