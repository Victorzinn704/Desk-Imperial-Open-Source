# Style Guide - Desk Imperial Docs

## 1. Voz

- Pessoa: terceira impessoal ou segunda do plural.
- Tempo verbal: presente para comportamento atual; passado apenas para changelog, ADR ou historico.
- Tom: tecnico, direto, sem hype.
- Idioma: PT-BR, com termos tecnicos consagrados em ingles quando necessario.

## 2. Regra principal

Toda afirmacao tecnica precisa apontar para evidencia real:

- `arquivo:linha`
- migration
- script
- workflow
- env var
- schema
- endpoint

Se nao houver evidencia, a frase nao entra.

## 3. O que e canonico

Documentos canonicos descrevem o comportamento atual do sistema.

Documentos historicos:

- podem ficar no repo
- nao podem ser apresentados como fonte primaria do estado atual

## 4. Estrutura minima por documento canonico

Cada documento canonico deve ter:

1. objetivo
2. publico
3. estado (`stable`, `draft`, `historical`)
4. data e commit de ultima verificacao
5. TL;DR
6. secoes com evidencia
7. links cruzados

## 5. Regras de escrita

- Proibir frases genericas que servem para qualquer SaaS.
- Evitar adjetivos vagos como `robusto`, `moderno`, `poderoso`.
- Preferir tabela quando a informacao for estrutural.
- Preferir listas curtas a blocos longos de texto.
- Declarar limites e riscos quando o comportamento nao for completo.

## 6. Locked terms

Estes termos devem ser usados sempre do mesmo jeito:

- **workspace**: escopo logico do negocio, ancorado no `OWNER`
- **OWNER**: dono do workspace
- **STAFF**: usuario operacional vinculado ao workspace
- **comanda**: entidade operacional de atendimento
- **mesa**: ponto fisico/logico de atendimento
- **caixa**: sessao de caixa e seus movimentos/fechamento
- **kitchen item**: item operacional de cozinha com status proprio
- **Admin PIN**: autorizacao sensivel por challenge opaco + cookie HttpOnly
- **realtime**: namespace `/operations`, rooms segmentadas e envelopes de evento
- **snapshot**: payload HTTP baseline
- **patch**: atualizacao incremental aplicada no cliente
- **reconcile**: refresh controlado quando o patch nao basta

## 7. O que nao fazer

- Nao contar modulo por numero fixo em docs de longa vida.
- Nao tratar alias legado como endpoint principal.
- Nao tratar release notes ou runbooks datados como documentacao de onboarding.
- Nao citar segredo real, token, DSN sensivel ou IP privado sem necessidade operacional clara.
- Nao duplicar a mesma explicacao em `README`, `INDEX` e docs de arquitetura.

## 8. Revisao editorial obrigatoria

Antes de fechar uma atualizacao de doc:

1. verificar se a fonte primaria continua correta
2. verificar links internos
3. verificar se o texto contradiz o codigo
4. marcar se o arquivo e `canonico`, `operacional ativo` ou `historico`
