# Data Protection Matrix — 2026-04-30

## Objetivo

Classificar os dados persistidos no Desk Imperial em quatro grupos:

1. **Plaintext operacional**
2. **Hash-only**
3. **Criptografia reversível**
4. **Criptografia reversível + blind index/hash auxiliar**

Regra central:

- se o sistema so precisa **comparar**, usar **hash**
- se o sistema precisa **ler de volta**, usar **criptografia reversível**
- se o sistema precisa **buscar/filtrar** por um dado sensível, usar **criptografia reversível + blind index/hash auxiliar**

## Criticidade imediata

### Achado forte

`TelegramLinkToken.token` hoje fica **em claro** no banco:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:330)

Isso nao deveria continuar assim.  
Esse caso deve migrar para **hash-only**, como ja acontece com `PasswordResetToken.tokenHash` e `OneTimeCode.codeHash`.

## Matriz por modelo

### `User`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:108)

| Campo                                                                                                           | Recomendação                                                      | Motivo                                                                      |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `id`, `companyOwnerId`, `role`, `status`, `createdAt`, `updatedAt`                                              | Plaintext operacional                                             | chave/relacao/status                                                        |
| `email`                                                                                                         | Plaintext operacional agora; futuro opcional `emailHash` auxiliar | login, unicidade e lookup direto                                            |
| `passwordHash`                                                                                                  | Hash-only                                                         | senha nunca deve ser reversível                                             |
| `adminPinHash`                                                                                                  | Hash-only                                                         | PIN nunca deve ser reversível                                               |
| `fullName`                                                                                                      | Plaintext operacional por ora                                     | exibicao e UX; criptografar agora traria custo alto                         |
| `companyName`                                                                                                   | Plaintext operacional por ora                                     | aparece em UI, relatorios e branding                                        |
| `companyStreetLine1`, `companyStreetNumber`, `companyAddressComplement`, `companyDistrict`, `companyPostalCode` | Criptografia reversível                                           | endereco detalhado e CEP sao sensiveis e nao sao chave primaria de consulta |
| `companyCity`, `companyState`, `companyCountry`                                                                 | Plaintext operacional                                             | filtros, BI e exibicao frequente                                            |
| `companyLatitude`, `companyLongitude`                                                                           | Plaintext operacional revisável                                   | usado para mapa; revisar se precisa precisao total                          |
| `preferredCurrency`, `emailVerifiedAt`, `passwordChangedAt`                                                     | Plaintext operacional                                             | metadata funcional                                                          |

### `Session`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:173)

| Campo                                                       | Recomendação                              | Motivo                                                         |
| ----------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| `tokenHash`                                                 | Hash-only                                 | token de sessao nunca deve ser reversível                      |
| `ipAddress`                                                 | Criptografia reversível + `ipHash` futuro | investigações de abuso pedem leitura, mas o dado é sensível    |
| `userAgent`                                                 | Criptografia reversível                   | fingerprint de dispositivo, sem necessidade de indexacao forte |
| `workspaceOwnerUserId`, `userId`, `employeeId`, `expiresAt` | Plaintext operacional                     | auth e relacionamento                                          |

### `DemoAccessGrant`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:195)

| Campo                           | Recomendação          | Motivo                                            |
| ------------------------------- | --------------------- | ------------------------------------------------- |
| `ipHash`                        | Hash-only             | correta para rate/rastreio sem manter IP em claro |
| `dayKey`, `sessionId`, `userId` | Plaintext operacional | lookup funcional                                  |

### `PasswordResetToken`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:215)

| Campo       | Recomendação                              | Motivo                             |
| ----------- | ----------------------------------------- | ---------------------------------- |
| `tokenHash` | Hash-only                                 | ja correto                         |
| `ipAddress` | Criptografia reversível + `ipHash` futuro | dado sensível, útil para segurança |
| `userAgent` | Criptografia reversível                   | dado sensível de dispositivo       |

### `OneTimeCode`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:226)

| Campo       | Recomendação                              | Motivo                                                                                      |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `codeHash`  | Hash-only                                 | ja correto                                                                                  |
| `email`     | Plaintext operacional por ora             | correlacao com fluxo de verificacao; futuro pode ganhar `emailHash` se a politica endurecer |
| `ipAddress` | Criptografia reversível + `ipHash` futuro | abuso/security                                                                              |
| `userAgent` | Criptografia reversível                   | abuso/security                                                                              |

### `UserConsent`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:268)

| Campo                                             | Recomendação                              | Motivo                                  |
| ------------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| `ipAddress`                                       | Criptografia reversível + `ipHash` futuro | prova de consentimento com dado pessoal |
| `userAgent`                                       | Criptografia reversível                   | trilha de auditoria sensível            |
| `documentId`, `userId`, `acceptedAt`, `revokedAt` | Plaintext operacional                     | auditoria funcional                     |

### `AuditLog`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:292)

| Campo                                                      | Recomendação                                                                               | Motivo                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `ipAddress`                                                | Criptografia reversível + `ipHash` futuro                                                  | auditoria e resposta a incidente                           |
| `userAgent`                                                | Criptografia reversível                                                                    | dado sensível sem necessidade de indexar em claro          |
| `metadata`                                                 | Sanitização forte antes de persistir; nao criptografar cegamente o JSON inteiro nesta fase | hoje blanket encryption destruiria debuggability e filtros |
| `event`, `resource`, `resourceId`, `severity`, `createdAt` | Plaintext operacional                                                                      | consulta operacional                                       |

### `TelegramAccount`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:309)

| Campo                                | Recomendação                  | Motivo                                   |
| ------------------------------------ | ----------------------------- | ---------------------------------------- |
| `telegramChatId`, `telegramUserId`   | Plaintext operacional por ora | webhook precisa lookup exato e frequente |
| `telegramUsername`                   | Plaintext operacional por ora | suporte e UX; baixa criticidade relativa |
| `status`, `linkedAt`, `lastActiveAt` | Plaintext operacional         | orquestracao do canal                    |

### `TelegramLinkToken`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:330)

| Campo                                                   | Recomendação                              | Motivo                                           |
| ------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| `token`                                                 | **Migrar para Hash-only**                 | token de uso único nao precisa ser lido de volta |
| `ipAddress`                                             | Criptografia reversível + `ipHash` futuro | trilha de seguranca                              |
| `userId`, `workspaceOwnerUserId`, `expiresAt`, `usedAt` | Plaintext operacional                     | controle do fluxo                                |

### `Employee`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:403)

| Campo              | Recomendação                             | Motivo                                              |
| ------------------ | ---------------------------------------- | --------------------------------------------------- |
| `passwordHash`     | Hash-only                                | correto                                             |
| `employeeCode`     | Plaintext operacional                    | login e unicidade por workspace                     |
| `displayName`      | Plaintext operacional                    | UX e listagem                                       |
| `salarioBase`      | Plaintext operacional protegido por RBAC | financeiro sensível, mas usado em calculo/relatorio |
| `percentualVendas` | Plaintext operacional protegido por RBAC | calculo/relatorio                                   |

### `CashSession`, `CashMovement`, `CashClosure`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:429)

| Campo                                  | Recomendação            | Motivo                                                     |
| -------------------------------------- | ----------------------- | ---------------------------------------------------------- |
| valores monetarios, status, datas, FKs | Plaintext operacional   | motor financeiro/BI                                        |
| `notes` / `note`                       | Criptografia reversível | texto livre tende a concentrar PII e observacoes sensíveis |

### `Comanda`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:527)

| Campo                                     | Recomendação                                            | Motivo                              |
| ----------------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| `customerName`                            | Plaintext operacional por ora                           | exibicao imediata no salao/PDV      |
| `customerDocument`                        | Criptografia reversível + `customerDocumentHash` futuro | documento pessoal e lookup eventual |
| `notes`                                   | Criptografia reversível                                 | texto livre e propenso a PII        |
| valores, status, `tableLabel`, datas, FKs | Plaintext operacional                                   | motor do PDV/cozinha/financeiro     |

### `ComandaItem`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:560)

| Campo                                                                 | Recomendação            | Motivo                      |
| --------------------------------------------------------------------- | ----------------------- | --------------------------- |
| `notes`                                                               | Criptografia reversível | observações do cliente/mesa |
| `productName`, `quantity`, `unitPrice`, `totalAmount`, kitchen fields | Plaintext operacional   | motor do PDV/cozinha        |

### `ComandaPayment`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:599)

| Campo                                       | Recomendação            | Motivo            |
| ------------------------------------------- | ----------------------- | ----------------- |
| `note`                                      | Criptografia reversível | comentario livre  |
| `method`, `amount`, `status`, `paidAt`, FKs | Plaintext operacional   | conciliacao/caixa |

### `Order`

Arquivo:

- [schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma:636)

| Campo                                     | Recomendação                                         | Motivo                                             |
| ----------------------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| `customerName`                            | Plaintext operacional por ora                        | exibicao e suporte                                 |
| `buyerDocument`                           | Criptografia reversível + `buyerDocumentHash` futuro | documento pessoal/fiscal                           |
| `buyerDistrict`                           | Criptografia reversível                              | dado pessoal e nao estrutural                      |
| `buyerCity`, `buyerState`, `buyerCountry` | Plaintext operacional                                | analytics e geo comercial                          |
| `buyerLatitude`, `buyerLongitude`         | Plaintext operacional revisável                      | analytics geograficos; revisar precisao necessaria |
| `sellerCode`, `sellerName`                | Plaintext operacional                                | analytics de venda por colaborador                 |
| `notes`                                   | Criptografia reversível                              | texto livre                                        |
| `channel`, valores, status, datas         | Plaintext operacional                                | analytics/financeiro                               |

## Padrão recomendado por classe de dado

### Hash-only

- senhas
- PINs
- tokens de reset
- codigos de uso unico
- tokens efemeros de vinculacao
- fingerprints de IP para rate/abuso

### Criptografia reversível

- documentos pessoais
- enderecos detalhados
- observacoes livres
- IP/User-Agent persistidos por trilha de seguranca

### Plaintext operacional

- IDs, FKs e enums
- valores monetarios
- timestamps
- campos de busca e analytics de alta frequencia

## Ordem de implementação segura

### Corte 1

1. migrar `TelegramLinkToken.token` para hash
2. criar infraestrutura de blind index para documentos (`buyerDocument`, `customerDocument`)
3. criptografar `notes` financeiras e operacionais mais sensiveis

### Corte 2

1. criptografar `ipAddress` e `userAgent` em `Session`, `PasswordResetToken`, `OneTimeCode`, `UserConsent`, `AuditLog`, `TelegramLinkToken`
2. adicionar `ipHash` onde o time realmente precisar correlação de abuso

### Corte 3

1. criptografar endereco detalhado do `User`
2. revisar necessidade de coordenadas precisas

## O que nao fazer agora

1. nao criptografar `email`, `employeeCode`, `barcode`, `tableLabel` e chaves de operacao sem desenhar blind index
2. nao criptografar `metadata` inteiro de `AuditLog` sem antes sanitizar e fatiar o que realmente e sensível
3. nao chamar isso de “zero exposure” enquanto Postgres/Redis internos ainda dependem majoritariamente da malha privada e nao de TLS ponto a ponto
