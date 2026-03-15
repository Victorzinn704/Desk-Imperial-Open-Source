# Coding Standards

## Objetivo

Definir um conjunto pequeno e claro de boas praticas para manter o projeto consistente.

## Regras gerais

- nomes de arquivos em `kebab-case`
- componentes React em `PascalCase`
- funcoes pequenas e com responsabilidade clara
- evitar logica pesada dentro de controllers e componentes visuais
- manter arquivos coesos e sem misturar camadas

## Frontend

- componentes de UI em `packages/ui`
- componentes de pagina em `apps/web/components`
- schemas de formulario separados da interface
- hooks para comportamento, nao para guardar regra de negocio critica
- chamadas HTTP centralizadas

## Backend

- controller recebe e delega
- service orquestra regra de negocio
- repositorio ou camada de acesso cuida da persistencia
- DTO valida entrada
- exceptions e logs padronizados

## Seguranca

- nunca logar segredos
- nunca confiar apenas na validacao do frontend
- sanitizar entradas e padronizar saidas
- validar autenticacao e autorizacao em todas as rotas protegidas

## Monitoramento

- usar `requestId`
- logar erros com contexto suficiente
- separar logs tecnicos de audit logs
