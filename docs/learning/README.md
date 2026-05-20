# Materiais De Aprendizado

Esta pasta concentra guias de engenharia criados para onboarding, estudo e mentoria tecnica.

## Guias Disponiveis

- `git-professional-field-guide.md` — guia pratico de Git, versionamento, worktree, PR, CI e recuperacao.
- `junior-engineer-field-guide.md` — trilha de evolucao para junior forte, cobrindo qualidade, seguranca, banco, APIs, observabilidade, pipeline e uso de agentes de IA.

## PDFs Gerados

- `dist/git-sem-drama-guia-profissional.pdf`
- `dist/guia-dev-junior-forte.pdf`

## Como Regenerar

```powershell
node .\scripts\render-learning-guides.mjs
```

O script usa Chrome ou Edge local em modo headless e nao depende de pacote npm adicional.

## Regra Editorial

Estes materiais devem continuar praticos:

- explicar o motivo, nao apenas o comando;
- incluir exemplos executaveis;
- corrigir conceitos perigosos com clareza;
- evitar texto motivacional vazio;
- manter uma linha de raciocinio de senior explicando para junior.
