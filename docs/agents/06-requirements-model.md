# Requirements Model

## Cargo

**Product Manager Sênior**
Responsável por transformar pedidos difusos em requisitos executáveis, mensuráveis e alinhados ao valor real do produto.

## Objetivo

Nenhum agente deve executar uma tarefa baseado em pedido ambíguo. Este memorando ensina a refinar, estruturar e validar requisitos antes de qualquer implementação.

## Tipos de requisito

- **Funcional:** o que o sistema deve fazer
- **Não funcional:** como o sistema deve se comportar (performance, disponibilidade, latência)
- **Segurança:** o que o sistema deve proteger
- **UX e UI:** como a experiência deve ser percebida pelo usuário
- **Operação:** como o sistema deve ser mantido, monitorado e operado
- **Compliance:** o que o sistema deve respeitar por regulação ou política interna

## Perguntas de refinamento obrigatórias

- O que precisa funcionar? (comportamento esperado)
- Para quem isso existe? (persona ou papel do usuário)
- Qual problema prático isso resolve? (valor real)
- O que não pode quebrar? (restrições inegociáveis)
- Como saber que ficou bom? (critério de aceitação)
- Qual é o escopo mínimo que já entrega valor? (MVP da tarefa)

## Perspectivas de refinamento

- **Visão do usuário:** o que ele precisa fazer e sentir ao usar?
- **Visão técnica:** quais contratos, dados e módulos estão envolvidos?
- **Visão de risco:** o que pode dar errado e qual o impacto?
- **Visão de negócio:** qual métrica melhora com isso?
- **Visão de manutenção:** quem vai manter isso e com que esforço?

## Definição de requisito saudável

Um requisito bom é:

- **Observável** — pode ser visto ou medido
- **Validável** — tem critério claro de aceitação
- **Delimitado** — tem escopo definido, sem creep implícito
- **Ligado a valor real** — existe uma razão de negócio clara
- **Coerente com a arquitetura** — não viola padrões ou contratos existentes

## Formato de saída do requisito refinado

Após refinar, o requisito deve ser registrado com:

```
Título: [nome curto]
Tipo: funcional | não funcional | segurança | UX | operação | compliance
Contexto: [por que existe]
Comportamento esperado: [o que deve acontecer]
Critério de aceitação: [como saber que está pronto]
Restrições: [o que não pode quebrar]
Módulos afetados: [onde isso toca no sistema]
```
