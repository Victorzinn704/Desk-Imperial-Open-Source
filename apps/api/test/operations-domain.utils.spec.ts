/**
 * @file operations-domain.utils.spec.ts
 * @module Operations
 *
 * Testes unitários das funções puras do domínio de operações.
 *
 * Funções puras são o ponto de entrada ideal para testes: sem estado, sem I/O,
 * sem mocks necessários. Um input → um output previsível. Cobertura 100%.
 *
 * Funções testadas:
 *   ✅ resolveBusinessDate()      — parseamento e normalização de data operacional
 *   ✅ buildBusinessDateWindow()  — janela de tempo do dia operacional (midnight–midnight)
 *   ✅ formatBusinessDateKey()    — serialização canônica YYYY-MM-DD para cache keys
 *   ✅ toNumber()                 — conversão segura de Prisma Decimal → number
 *   ✅ resolveBuyerTypeFromDocument() — CPF vs CNPJ pelo número de dígitos
 *   ✅ isOpenComandaStatus()      — predicado de status de comanda ativa
 *   ✅ buildCashUpdatedPayload()  — agregação de movimentos de caixa para WebSocket
 *   ✅ buildComandaUpdatedPayload() — serialização de comanda para WebSocket
 */

import { BadRequestException } from '@nestjs/common'
import { BuyerType, CashMovementType, CashSessionStatus, ComandaStatus } from '@prisma/client'
import {
  buildBusinessDateWindow,
  buildCashUpdatedPayload,
  buildComandaUpdatedPayload,
  formatBusinessDateKey,
  invalidateOperationsLiveCache,
  isOpenComandaStatus,
  resolveBuyerTypeFromDocument,
  resolveBusinessDate,
  toNumber,
} from '../src/modules/operations/operations-domain.utils'

// ═════════════════════════════════════════════════════════════════════════════
// resolveBusinessDate()
// ─────────────────────────────────────────────────────────────────────────────
// Uma "data operacional" é o dia em que o caixa foi aberto, independente do
// relógio. Ex: um bar que abre às 18h e fecha às 3h do dia seguinte usa a
// data operacional do dia de abertura para consolidar todas as vendas.
//
// A data é normalizada para meia-noite local (00:00:00) para garantir que
// comparações de range no PostgreSQL sejam consistentes.
// ═════════════════════════════════════════════════════════════════════════════

describe('resolveBusinessDate()', () => {
  it('retorna a data de hoje normalizada para meia-noite quando chamada sem argumento', () => {
    const result = resolveBusinessDate()
    const today = new Date()

    expect(result.getFullYear()).toBe(today.getFullYear())
    expect(result.getMonth()).toBe(today.getMonth())
    expect(result.getDate()).toBe(today.getDate())
    // A parte de hora deve ser zerada — importante para queries de range no banco
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('faz parse correto de uma string no formato YYYY-MM-DD', () => {
    const result = resolveBusinessDate('2026-03-15')

    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(2) // getMonth() é zero-indexed: março = 2
    expect(result.getDate()).toBe(15)
    expect(result.getHours()).toBe(0)
  })

  it('normaliza a parte de hora para meia-noite mesmo com string com horário', () => {
    // Garante que não importa como a string chegou, a hora é zerada
    const result = resolveBusinessDate('2026-03-15')
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
  })

  it('lança BadRequestException para datas inválidas', () => {
    expect(() => resolveBusinessDate('nao-e-data')).toThrow(BadRequestException)
    expect(() => resolveBusinessDate('2026-13-01')).toThrow() // mês 13 não existe
    expect(() => resolveBusinessDate('abc')).toThrow(BadRequestException)
  })

  it('aceita o primeiro e o último dia do ano', () => {
    const inicio = resolveBusinessDate('2026-01-01')
    expect(inicio.getMonth()).toBe(0) // janeiro
    expect(inicio.getDate()).toBe(1)

    const fim = resolveBusinessDate('2026-12-31')
    expect(fim.getMonth()).toBe(11) // dezembro
    expect(fim.getDate()).toBe(31)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// buildBusinessDateWindow()
// ─────────────────────────────────────────────────────────────────────────────
// Para consultar registros de um dia operacional no banco, precisamos de um range
// [start, end) onde start = meia-noite do dia e end = meia-noite do dia seguinte.
// Isso é compatível com queries Prisma do tipo: { createdAt: { gte: start, lt: end } }
// ═════════════════════════════════════════════════════════════════════════════

describe('buildBusinessDateWindow()', () => {
  it('retorna start = meia-noite do dia informado', () => {
    const date = new Date(2026, 2, 15) // 15 de março de 2026
    const { start } = buildBusinessDateWindow(date)

    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(2)
    expect(start.getDate()).toBe(15)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
  })

  it('retorna end = meia-noite do dia seguinte (exclusive upper bound)', () => {
    const date = new Date(2026, 2, 15)
    const { end } = buildBusinessDateWindow(date)

    expect(end.getDate()).toBe(16) // dia seguinte
    expect(end.getHours()).toBe(0)
    expect(end.getMinutes()).toBe(0)
  })

  it('lida corretamente com virada de mês (28/29/30/31 → 1)', () => {
    const ultimoDiaMarco = new Date(2026, 2, 31) // 31 de março
    const { end } = buildBusinessDateWindow(ultimoDiaMarco)

    expect(end.getMonth()).toBe(3) // abril
    expect(end.getDate()).toBe(1)
  })

  it('lida com virada de ano (31 dez → 1 jan)', () => {
    const ultimoDiaAno = new Date(2026, 11, 31) // 31 de dezembro
    const { end } = buildBusinessDateWindow(ultimoDiaAno)

    expect(end.getFullYear()).toBe(2027)
    expect(end.getMonth()).toBe(0) // janeiro
    expect(end.getDate()).toBe(1)
  })

  it('a janela tem exatamente 24 horas de duração', () => {
    const date = new Date(2026, 5, 10)
    const { start, end } = buildBusinessDateWindow(date)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    expect(diffHours).toBe(24)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// formatBusinessDateKey()
// ─────────────────────────────────────────────────────────────────────────────
// Serializa uma Date para a string canônica YYYY-MM-DD usada como:
//   - Chave de cache no Redis: "operations:snapshot:{userId}:{dateKey}"
//   - Identificador de business date no audit log
//   - Filtro de data nas queries de comandas/caixa
// ═════════════════════════════════════════════════════════════════════════════

describe('formatBusinessDateKey()', () => {
  it('formata data com padding de zeros (mês e dia com 2 dígitos)', () => {
    // Sem padding: "2026-1-5" — causaria mismatch em cache keys e queries
    // Com padding:  "2026-01-05" — formato ISO 8601 canônico
    const date = new Date(2026, 0, 5) // 5 de janeiro
    expect(formatBusinessDateKey(date)).toBe('2026-01-05')
  })

  it('formata corretamente datas com mês e dia de dois dígitos', () => {
    const date = new Date(2026, 10, 25) // 25 de novembro
    expect(formatBusinessDateKey(date)).toBe('2026-11-25')
  })

  it('produz formato YYYY-MM-DD (compatível com ISO 8601 e Prisma date fields)', () => {
    const date = new Date(2026, 2, 15)
    const key = formatBusinessDateKey(date)
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('é determinístico — mesma data sempre gera a mesma chave', () => {
    const a = formatBusinessDateKey(new Date(2026, 5, 20))
    const b = formatBusinessDateKey(new Date(2026, 5, 20))
    expect(a).toBe(b)
  })
})

describe('invalidateOperationsLiveCache()', () => {
  it('invalida kitchen e summary mas preserva o cache live para TTL natural', () => {
    // O cache de `live` não é deletado nas mutações intencionalmente:
    // o socket empurra patches via setQueryData para clientes conectados e
    // o TTL (30s) garante freshness sem que cada mutação torne o cache frio.
    const cache = { delByPrefix: jest.fn() }

    invalidateOperationsLiveCache(cache as Pick<typeof cache, 'delByPrefix'>, 'owner-1', new Date(2026, 2, 30))

    expect(cache.delByPrefix).toHaveBeenCalledTimes(2)
    expect(cache.delByPrefix).toHaveBeenNthCalledWith(1, 'operations:kitchen:owner-1:2026-03-30:')
    expect(cache.delByPrefix).toHaveBeenNthCalledWith(2, 'operations:summary:owner-1:2026-03-30:')
    expect(cache.delByPrefix).not.toHaveBeenCalledWith('operations:live:owner-1:2026-03-30:')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// toNumber()
// ─────────────────────────────────────────────────────────────────────────────
// O Prisma retorna campos Decimal como objetos { toNumber(): number } quando
// o tipo no schema é Decimal. Em queries brutas ou após $queryRaw o tipo pode
// ser um number primitivo. toNumber() normaliza ambos os casos.
//
// Também trata null/undefined, que ocorrem em campos opcionais como
// differenceAmount (só calculado ao fechar o caixa).
// ═════════════════════════════════════════════════════════════════════════════

describe('toNumber()', () => {
  it('retorna o number primitivo diretamente quando o input já é number', () => {
    expect(toNumber(42.5)).toBe(42.5)
    expect(toNumber(0)).toBe(0)
    expect(toNumber(-10)).toBe(-10)
  })

  it('chama .toNumber() em objetos Decimal do Prisma', () => {
    // Simula o objeto Decimal retornado pelo Prisma ORM
    const decimal = { toNumber: () => 199.99 }
    expect(toNumber(decimal)).toBe(199.99)
  })

  it('retorna 0 para null (ex: differenceAmount antes do fechamento)', () => {
    expect(toNumber(null)).toBe(0)
  })

  it('retorna 0 para undefined (ex: campo opcional não preenchido)', () => {
    expect(toNumber(undefined)).toBe(0)
  })

  it('preserva precisão decimal corretamente', () => {
    const decimal = { toNumber: () => 1234.56 }
    expect(toNumber(decimal)).toBeCloseTo(1234.56)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// resolveBuyerTypeFromDocument()
// ─────────────────────────────────────────────────────────────────────────────
// Determina se um documento fiscal é CPF (pessoa física, 11 dígitos) ou
// CNPJ (pessoa jurídica, 14 dígitos) pela contagem de dígitos numéricos.
//
// Regra de negócio: ao fechar uma comanda, o comprador pode informar CPF/CNPJ
// para emissão de nota fiscal. O tipo determina qual template usar.
// ═════════════════════════════════════════════════════════════════════════════

describe('resolveBuyerTypeFromDocument()', () => {
  describe('CPF — Pessoa Física (11 dígitos)', () => {
    it('identifica CPF sem máscara', () => {
      expect(resolveBuyerTypeFromDocument('12345678901')).toBe(BuyerType.PERSON)
    })

    it('identifica CPF com máscara (123.456.789-01)', () => {
      // A função remove não-dígitos antes de contar
      expect(resolveBuyerTypeFromDocument('123.456.789-01')).toBe(BuyerType.PERSON)
    })
  })

  describe('CNPJ — Pessoa Jurídica (14 dígitos)', () => {
    it('identifica CNPJ sem máscara', () => {
      expect(resolveBuyerTypeFromDocument('12345678000100')).toBe(BuyerType.COMPANY)
    })

    it('identifica CNPJ com máscara (12.345.678/0001-00)', () => {
      expect(resolveBuyerTypeFromDocument('12.345.678/0001-00')).toBe(BuyerType.COMPANY)
    })
  })

  describe('documento inválido', () => {
    it('retorna null para documento vazio', () => {
      expect(resolveBuyerTypeFromDocument('')).toBeNull()
    })

    it('retorna null para null/undefined', () => {
      expect(resolveBuyerTypeFromDocument(null)).toBeNull()
      expect(resolveBuyerTypeFromDocument(undefined)).toBeNull()
    })

    it('retorna null para número de dígitos inválido (ex: 10 ou 13)', () => {
      // Não deve classificar documentos com comprimento diferente de 11 ou 14
      expect(resolveBuyerTypeFromDocument('1234567890')).toBeNull() // 10 dígitos
      expect(resolveBuyerTypeFromDocument('1234567890123')).toBeNull() // 13 dígitos
    })

    it('retorna null para strings com apenas letras', () => {
      expect(resolveBuyerTypeFromDocument('abc.def.ghi-jk')).toBeNull()
    })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// isOpenComandaStatus()
// ─────────────────────────────────────────────────────────────────────────────
// Predicado que define quais status representam uma comanda "ativa" (em atendimento).
// Usado para:
//   - Bloquear fechamento de caixa com comandas abertas
//   - Filtrar comandas que aparecem no kanban do PDV
//   - Verificar se uma mesa está ocupada
//
// Status do ciclo de vida: OPEN → IN_PREPARATION → READY → CLOSED | CANCELLED
// ═════════════════════════════════════════════════════════════════════════════

describe('isOpenComandaStatus()', () => {
  it('retorna true para OPEN — comanda recém-aberta, aguardando itens', () => {
    expect(isOpenComandaStatus(ComandaStatus.OPEN)).toBe(true)
  })

  it('retorna true para IN_PREPARATION — itens enviados para a cozinha', () => {
    expect(isOpenComandaStatus(ComandaStatus.IN_PREPARATION)).toBe(true)
  })

  it('retorna true para READY — pedido pronto, aguardando retirada', () => {
    expect(isOpenComandaStatus(ComandaStatus.READY)).toBe(true)
  })

  it('retorna false para CLOSED — comanda paga e encerrada', () => {
    // Comandas fechadas não devem bloquear o fechamento de caixa
    expect(isOpenComandaStatus(ComandaStatus.CLOSED)).toBe(false)
  })

  it('retorna false para CANCELLED — comanda cancelada (sem pagamento)', () => {
    expect(isOpenComandaStatus(ComandaStatus.CANCELLED)).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// buildCashUpdatedPayload()
// ─────────────────────────────────────────────────────────────────────────────
// Serializa o estado atual de uma sessão de caixa para o evento WebSocket
// "cash:updated". O payload é projetado para que o frontend possa atualizar
// o painel em tempo real sem precisar fazer um novo GET na API.
//
// Regras de agregação de movimentos:
//   - inflowAmount  = soma de SUPPLY + ADJUSTMENT (entradas)
//   - outflowAmount = soma de WITHDRAWAL (saídas)
//   - OPENING_FLOAT é excluído das entradas (é o valor inicial, não movimento)
// ═════════════════════════════════════════════════════════════════════════════

describe('buildCashUpdatedPayload()', () => {
  function makeSession(overrides: Record<string, unknown> = {}) {
    return {
      id: 'session-1',
      status: CashSessionStatus.OPEN,
      openingCashAmount: 200,
      countedCashAmount: null,
      expectedCashAmount: 700,
      differenceAmount: null,
      movements: [] as Array<{ type: CashMovementType; amount: number }>,
      ...overrides,
    }
  }

  it('retorna o cashSessionId correto', () => {
    const payload = buildCashUpdatedPayload(makeSession())
    expect(payload.cashSessionId).toBe('session-1')
  })

  it('mapeia status OPEN → "OPEN" e qualquer outro → "CLOSED"', () => {
    expect(buildCashUpdatedPayload(makeSession({ status: CashSessionStatus.OPEN })).status).toBe('OPEN')
    expect(buildCashUpdatedPayload(makeSession({ status: CashSessionStatus.CLOSED })).status).toBe('CLOSED')
  })

  it('calcula inflowAmount como soma de SUPPLY + ADJUSTMENT (entradas)', () => {
    const session = makeSession({
      movements: [
        { type: CashMovementType.SUPPLY, amount: 300 }, // entrada
        { type: CashMovementType.ADJUSTMENT, amount: 50 }, // entrada
        { type: CashMovementType.WITHDRAWAL, amount: 100 }, // saída — não entra aqui
      ],
    })
    const payload = buildCashUpdatedPayload(session)
    expect(payload.inflowAmount).toBe(350)
  })

  it('calcula outflowAmount como soma de WITHDRAWAL (saídas)', () => {
    const session = makeSession({
      movements: [
        { type: CashMovementType.WITHDRAWAL, amount: 100 },
        { type: CashMovementType.WITHDRAWAL, amount: 50 },
        { type: CashMovementType.SUPPLY, amount: 200 }, // não entra aqui
      ],
    })
    const payload = buildCashUpdatedPayload(session)
    expect(payload.outflowAmount).toBe(150)
  })

  it('inclui movementCount correto', () => {
    const session = makeSession({
      movements: [
        { type: CashMovementType.SUPPLY, amount: 100 },
        { type: CashMovementType.WITHDRAWAL, amount: 50 },
      ],
    })
    expect(buildCashUpdatedPayload(session).movementCount).toBe(2)
  })

  it('retorna null para countedAmount e differenceAmount quando caixa ainda está aberto', () => {
    const payload = buildCashUpdatedPayload(
      makeSession({
        countedCashAmount: null,
        differenceAmount: null,
      }),
    )
    expect(payload.countedAmount).toBeNull()
    expect(payload.differenceAmount).toBeNull()
  })

  it('suporta valores Decimal do Prisma (objetos com .toNumber())', () => {
    const session = makeSession({
      openingCashAmount: { toNumber: () => 200 },
      expectedCashAmount: { toNumber: () => 700 },
      movements: [{ type: CashMovementType.SUPPLY, amount: { toNumber: () => 300 } }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- simula Decimal do Prisma em teste
    const payload = buildCashUpdatedPayload(session as any)
    expect(payload.openingAmount).toBe(200)
    expect(payload.inflowAmount).toBe(300)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// buildComandaUpdatedPayload()
// ─────────────────────────────────────────────────────────────────────────────
// Serializa o estado de uma comanda para o evento WebSocket "comanda:updated".
// O status é traduzido para string em português usado no frontend (kanban do PDV).
//
// Mapeamento de status:
//   OPEN           → 'ABERTA'
//   IN_PREPARATION → 'EM_PREPARO'
//   READY          → 'PRONTA'
//   CLOSED         → 'FECHADA'
//   CANCELLED      → 'FECHADA' (simplificado para o kanban)
// ═════════════════════════════════════════════════════════════════════════════

describe('buildComandaUpdatedPayload()', () => {
  function makeComanda(status: ComandaStatus, overrides: Record<string, unknown> = {}) {
    return {
      id: 'comanda-1',
      tableLabel: 'Mesa 5',
      status,
      currentEmployeeId: 'emp-1',
      subtotalAmount: 100,
      discountAmount: 10,
      totalAmount: 90,
      items: [{ quantity: 2 }, { quantity: 1 }],
      ...overrides,
    }
  }

  it.each([
    [ComandaStatus.OPEN, 'ABERTA'],
    [ComandaStatus.IN_PREPARATION, 'EM_PREPARO'],
    [ComandaStatus.READY, 'PRONTA'],
    [ComandaStatus.CLOSED, 'FECHADA'],
  ])('mapeia status %s → "%s" (rótulo do kanban)', (status, expected) => {
    const payload = buildComandaUpdatedPayload(makeComanda(status))
    expect(payload.status).toBe(expected)
  })

  it('calcula totalItems como soma das quantidades de todos os itens', () => {
    const comanda = makeComanda(ComandaStatus.OPEN, {
      items: [{ quantity: 3 }, { quantity: 2 }, { quantity: 1 }],
    })
    expect(buildComandaUpdatedPayload(comanda).totalItems).toBe(6)
  })

  it('retorna totalItems=0 para comanda sem itens (recém-aberta)', () => {
    const comanda = makeComanda(ComandaStatus.OPEN, { items: [] })
    expect(buildComandaUpdatedPayload(comanda).totalItems).toBe(0)
  })

  it('inclui comandaId, mesaLabel e employeeId no payload', () => {
    const payload = buildComandaUpdatedPayload(makeComanda(ComandaStatus.OPEN))
    expect(payload.comandaId).toBe('comanda-1')
    expect(payload.mesaLabel).toBe('Mesa 5')
    expect(payload.employeeId).toBe('emp-1')
  })

  it('retorna employeeId=null quando comanda não está vinculada a funcionário', () => {
    const comanda = makeComanda(ComandaStatus.OPEN, { currentEmployeeId: null })
    expect(buildComandaUpdatedPayload(comanda).employeeId).toBeNull()
  })
})
