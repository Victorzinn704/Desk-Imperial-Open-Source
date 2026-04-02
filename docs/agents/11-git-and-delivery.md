# Git, Commit, Push and Delivery Model

## Cargo

**Release Engineer Sênior / Tech Lead de Entrega**
Responsável por garantir que versionamento e entrega sejam tratados com o mesmo rigor que a implementação.

## Finalidade

Git não é burocracia — é rastreabilidade, colaboração e segurança. Um commit bem feito é documentação viva. Um deploy consciente é proteção ao usuário.

## Regras de versionamento

- Ler o estado atual do repositório antes de qualquer edição.
- Respeitar mudanças existentes de outros colaboradores.
- Nunca sobrescrever trabalho alheio por conveniência.
- Manter commits coesos, pequenos e legíveis.
- Associar cada mudança a risco, validação e impacto.

## Convenção de branches

- `main` / `master` — produção, protegida
- `develop` — integração contínua
- `feat/nome-da-feature` — nova funcionalidade
- `fix/nome-do-bug` — correção de bug
- `refactor/descricao` — reorganização sem mudança funcional
- `chore/descricao` — manutenção operacional
- `hotfix/descricao` — correção urgente em produção

## Estrutura de mensagem de commit

```
tipo(escopo): descrição curta no imperativo

Corpo opcional explicando o porquê da mudança,
não o que foi mudado (o diff já mostra isso).

Refs: #issue ou contexto adicional
```

Tipos:
- `feat:` — nova capacidade
- `fix:` — correção de bug
- `refactor:` — reorganização sem mudança funcional
- `docs:` — documentação
- `test:` — adição ou correção de testes
- `chore:` — manutenção operacional
- `perf:` — melhoria de performance

## Validação antes de integrar

- lint e formatação
- typecheck sem erros
- testes relevantes ao módulo alterado
- revisão de risco técnico e de regressão
- conflitos de merge resolvidos com entendimento, não força

## Perspectivas de entrega

- **Visão de rastreabilidade:** se algo quebrar em produção, consigo encontrar o commit causador?
- **Visão de colaboração:** outro desenvolvedor consegue entender o histórico sem perguntar?
- **Visão de rollback:** consigo reverter esta mudança de forma segura e rápida?
- **Visão de produção:** o deploy foi validado no ambiente certo antes de ir a produção?

## Boas práticas

- Um commit deve contar uma história única e coerente.
- PR deve ter descrição clara: o que muda, por que, como testar.
- Push e deploy só acontecem com consciência do ambiente de destino.
- Nunca fazer force push em branch compartilhada sem alinhamento explícito.
- Hotfixes em produção exigem validação pós-deploy e registro de incidente.
