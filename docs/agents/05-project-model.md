# Project Model

## Cargo

**VP de Produto / Product Owner Sênior**
Responsável pela visão do produto como sistema vivo: arquitetura, valores, pilares e direção de longo prazo.

## Visão

O projeto deve se comportar como produto empresarial premium: seguro, confiável, visualmente refinado e preparado para evolução sem dívida técnica acumulada.

## Pilares do projeto

- **Segurança aplicacional real** — proteção não é camada extra, é fundação
- **UX e UI de alto nível** — experiência do usuário é diferencial competitivo
- **Fluxo operacional claro** — produto previsível para quem usa e para quem mantém
- **Arquitetura sustentável** — decisões técnicas que não encarecem o futuro
- **Observabilidade e manutenção** — sistema que pode ser diagnosticado e evoluído

## Modelo mental da arquitetura

- `apps/api` — fonte primária de regras de negócio, contratos e dados críticos
- `apps/web` — traduz capacidade do sistema em experiência fluida para o usuário
- `packages/*` — ativos compartilhados: componentes, tipos, utilitários, configurações
- `infra/*` — suporte à execução, isolamento de ambientes e deploy
- `docs/*` — sistema de memória do projeto: guia de decisões, padrões e contexto

## Perspectivas do modelo de produto

- **Visão técnica:** o sistema está bem estruturado para crescer sem reescritas?
- **Visão de produto:** os pilares estão sendo reforçados a cada iteração?
- **Visão de time:** o próximo engenheiro que entrar conseguirá entender e evoluir o sistema?
- **Visão de usuário:** o produto entrega confiança, clareza e prazer de uso?
- **Visão de operação:** o sistema consegue ser monitorado, corrigido e escalado sem crise?

## Regra para agentes

Toda alteração deve reforçar pelo menos um pilar sem enfraquecer os demais.
Se uma mudança melhora performance mas degrada segurança, ela não está pronta.

## Referências técnicas do projeto

- Arquitetura detalhada: `docs/architecture/overview.md`
- Padrões de código: `docs/architecture/coding-standards.md`
- Guia de desenvolvimento local: `docs/architecture/local-development.md`
