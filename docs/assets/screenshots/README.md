# Screenshots Publicos

Este diretorio guarda imagens publicaveis do Desk Imperial para README, docs e portfolio tecnico.

## Regra de publicacao

Somente inclua screenshots que atendam a todos os pontos:

- dados ficticios ou anonimizados;
- sem e-mail, telefone, CPF/CNPJ, endereco ou nome real de cliente;
- sem token, chave, DSN, webhook secret, URL interna, IP real ou nome de VM;
- sem painel administrativo de provedor cloud, banco, CI privado ou observabilidade real;
- sem evidencia de incidente, falha operacional ou topologia privada;
- com resolucao suficiente para leitura no GitHub.

## Inventario atual

| Arquivo               | Superficie            | Observacao                    |
| --------------------- | --------------------- | ----------------------------- |
| `overview.png`        | Dashboard operacional | KPIs e ranking com dados demo |
| `pdv-comandas.png`    | PDV / Comandas        | Kanban com comandas ficticias |
| `salao.png`           | Salao                 | Experiencia de mesas/operacao |
| `financeiro.png`      | Financeiro            | Indicadores financeiros demo  |
| `portfolio.png`       | Portfolio             | Catalogo e produtos ficticios |
| `equipe.png`          | Equipe                | Gestao de funcionarios demo   |
| `folha-pagamento.png` | Folha de pagamento    | Massa sintetica               |
| `calendario.png`      | Calendario comercial  | Eventos e planejamento demo   |

## Como atualizar

1. Gere ou capture a tela usando ambiente demo.
2. Salve em PNG otimizado neste diretorio.
3. Revise visualmente antes de commitar.
4. Rode:

```powershell
npm run repo:open-source:review
```

5. Gere o snapshot open source somente depois dos gates locais.
