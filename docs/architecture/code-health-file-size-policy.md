# Code Health File Size Policy

## Regra

Todo arquivo de código novo ou alterado deve mirar em até **300 linhas**.

Arquivos entre **301 e 450 linhas** entram em zona de atenção: podem passar apenas quando a coesão estiver clara, as funções forem pequenas e houver motivo técnico explícito no PR.

Arquivos acima de **450 linhas** entram em rota obrigatória de refatoração antes de novos incrementos funcionais.

## Limites Complementares

- Funções novas devem mirar em até **50 linhas**.
- Componentes React devem manter complexidade ciclomática abaixo de **10**.
- Serviços e scripts devem manter complexidade abaixo de **15**.
- Funções públicas devem evitar mais de **4 argumentos**; use objeto de parâmetro quando houver contexto composto.
- Condicionais com mais de uma regra de negócio devem ser extraídas para uma função nomeada.
- Duplicação entre testes, scripts e serviços deve virar fixture, helper, tabela de casos ou adapter.

## Exceções

Exceções precisam ser raras e explícitas:

- arquivos gerados;
- migrations;
- snapshots ou fixtures grandes que não contenham lógica;
- documentação.

Mesmo nesses casos, prefira dividir quando a leitura ou o review ficarem lentos.

## Checklist De Review

Antes de aprovar ou commitar:

- o arquivo alterado ficou abaixo de 300 linhas?
- se passou de 300, existe plano claro para reduzir?
- alguma função nova passou de 50 linhas?
- a complexidade foi reduzida no arquivo tocado?
- branches longos foram substituídos por funções nomeadas, lookup table ou estado explícito?
- helpers extraídos têm nome de regra de negócio, não nome genérico?
- testes e smoke scripts continuam verificando comportamento, não só implementação?

Para o padrão completo de extração, use `docs/architecture/code-health-refactoring-standard.md`.
