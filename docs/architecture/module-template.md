# Module Template — Desk Imperial

> Todo novo módulo DEVE seguir este template. PRs que criam módulos fora do padrão serão rejeitados.

---

## 1. Estrutura Obrigatória

### Backend (API — NestJS)

```
src/modules/nome-do-modulo/
├── nome-do-modulo.module.ts       # Módulo NestJS
├── nome-do-modulo.controller.ts   # Controller (se expõe HTTP)
├── nome-do-modulo.service.ts      # Serviço principal
├── nome-do-modulo.types.ts        # Tipos internos (se necessário)
├── nome-do-modulo.constants.ts    # Constantes (se necessário)
├── dto/                           # Data Transfer Objects
│   ├── create-xxx.dto.ts
│   └── update-xxx.dto.ts
├── guards/                        # Guards (se necessário)
│   └── xxx.guard.ts
└── utils/                         # Funções puras (se necessário)
    └── xxx-helper.util.ts
```

### Frontend (Web — Next.js)

```
components/nome-do-modulo/
├── nome-do-componente.tsx         # Componente principal
├── nome-do-componente.test.tsx    # Testes
├── hooks/                         # Hooks relacionados
│   └── use-nome-do-hook.ts
└── utils/                         # Funções auxiliares puras
    └── xxx-helper.util.ts
```

---

## 2. Template de Módulo Backend

### `nome-do-modulo.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { NomeDoModuloController } from './nome-do-modulo.controller'
import { NomeDoModuloService } from './nome-do-modulo.service'
import { PrismaModule } from '../../database/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [NomeDoModuloController],
  providers: [NomeDoModuloService],
  exports: [NomeDoModuloService],
})
export class NomeDoModuloModule {}
```

### `nome-do-modulo.controller.ts`

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { NomeDoModuloService } from './nome-do-modulo.service'
import { CreateNomeDto } from './dto/create-nome.dto'

@Controller('nome-do-recurso')
export class NomeDoModuloController {
  constructor(private readonly service: NomeDoModuloService) {}

  @Post()
  create(@Body() dto: CreateNomeDto) {
    return this.service.create(dto)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id)
  }
}
```

### `nome-do-modulo.service.ts`

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { CreateNomeDto } from './dto/create-nome.dto'

@Injectable()
export class NomeDoModuloService {
  private readonly logger = new Logger(NomeDoModuloService.name)

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNomeDto) {
    this.logger.log('Criando novo recurso')
    const result = await this.prisma.nome.create({ data: dto })
    this.logger.log('Recurso criado com sucesso')
    return result
  }

  async findById(id: string) {
    const result = await this.prisma.nome.findUnique({ where: { id } })
    if (!result) {
      throw new NotFoundException(`Recurso ${id} não encontrado`)
    }
    return result
  }
}
```

### `dto/create-nome.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class CreateNomeDto {
  @IsString()
  @IsNotEmpty()
  nome: string

  @IsString()
  @IsOptional()
  descricao?: string
}
```

---

## 3. Template de Componente Frontend

### `nome-do-componente.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface NomeDoComponenteProps {
  resourceId: string
}

export function NomeDoComponente({ resourceId }: NomeDoComponenteProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['recurso', resourceId],
    queryFn: () => api.get(`/recurso/${resourceId}`).then(res => res.data),
  })

  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      <h2>{data.nome}</h2>
    </div>
  )
}
```

### `hooks/use-nome-do-hook.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useNomeDoHook(resourceId: string) {
  return useQuery({
    queryKey: ['recurso', resourceId],
    queryFn: () => api.get(`/recurso/${resourceId}`).then((res) => res.data),
    staleTime: 1000 * 60 * 5,
  })
}
```

---

## 4. Checklist de Code Review para Novos Módulos

Antes de aprovar um PR que cria um novo módulo, verifique:

### Estrutura

- [ ] Segue a estrutura obrigatória (Seção 1)
- [ ] Nomes de arquivos em `kebab-case`
- [ ] Sufixos corretos (`.service.ts`, `.controller.ts`, etc.)
- [ ] Nenhum arquivo excede 300 linhas

### Código

- [ ] Imports organizados na ordem correta (externos → internos → relativos)
- [ ] `import type` para tipos
- [ ] Sem `any` sem justificativa
- [ ] Sem `console.log` na API (usar `Logger`)
- [ ] Error handling com `HttpException` (API) ou toast + faro (Web)
- [ ] DTOs com `class-validator` (API) ou Zod (Web)

### Testes

- [ ] Testes unitários para o serviço
- [ ] Testes para o controller (API) ou componente (Web)
- [ ] Testes para caminhos de erro

### Segurança

- [ ] Rotas protegidas com guards apropriados
- [ ] Validação de entrada (DTO/Zod)
- [ ] Sem dados sensíveis em logs

### Registro

- [ ] Módulo importado no `app.module.ts` (API) ou layout (Web)
- [ ] Tipos compartilhados adicionados a `packages/types/src/contracts.ts`
- [ ] Documentação atualizada em `docs/architecture/modules/`

---

## 5. O que NÃO fazer ao criar um módulo

- [ ] Criar um arquivo `.service.ts` com mais de 300 linhas — divida em serviços menores
- [ ] Usar sufixos inventados (`.helper.ts`, `.funcs.ts`, `.methods.ts`) — use os sufixos padrão
- [ ] Colocar lógica de negócio em controllers — delegue ao service
- [ ] Colocar lógica de negócio em componentes — extraia para hooks ou utils
- [ ] Duplicar tipos entre API e Web — use `@contracts/contracts`
- [ ] Criar guards sem testes — todo guard DEVE ter testes de autorização
- [ ] Misturar concerns — um módulo, uma responsabilidade
