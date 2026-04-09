/**
 * @file constants.test.ts
 *
 * Coverage for salao/constants.ts helper functions:
 *   - garcomCor()
 *   - initials()
 *   - urgencyLevel()
 *   - urgencyBorderColor()
 *   - urgencyShadow()
 *   - resolveMesaComanda()
 */

import { describe, expect, it } from 'vitest'
import {
  garcomCor,
  initials,
  urgencyLevel,
  urgencyBorderColor,
  urgencyShadow,
  resolveMesaComanda,
  GARCOM_CORES,
} from './constants'
import type { Mesa, Comanda, Garcom } from '../pdv-types'

function makeMesa(overrides: Partial<Mesa> = {}): Mesa {
  return {
    id: 'mesa-1',
    numero: '1',
    capacidade: 4,
    status: 'livre',
    ...overrides,
  }
}

function makeComanda(overrides: Partial<Comanda> = {}): Comanda {
  return {
    id: 'comanda-1',
    status: 'aberta',
    mesa: '1',
    itens: [],
    desconto: 0,
    acrescimo: 0,
    abertaEm: new Date(),
    ...overrides,
  }
}

function makeGarcom(overrides: Partial<Garcom> = {}): Garcom {
  return {
    id: 'garcom-1',
    nome: 'Pedro Alves',
    cor: '#36f57c',
    ...overrides,
  }
}

describe('garcomCor', () => {
  it('retorna cor do proprio garcom quando definida', () => {
    const garcom = makeGarcom({ cor: '#ff0000' })
    expect(garcomCor(garcom, [garcom])).toBe('#ff0000')
  })

  it('usa GARCOM_CORES ciclico quando garcom.cor e string vazia', () => {
    const garcom = makeGarcom({ id: 'g-1', cor: '' })
    const all = [garcom]
    expect(garcomCor(garcom, all)).toBe(GARCOM_CORES[0])
  })

  it('retorna cor ciclica baseada no indice do garcom na lista', () => {
    const garcons = GARCOM_CORES.map((_, i) => makeGarcom({ id: `g-${i}`, cor: '' }))
    // Index 8 should wrap to index 0
    const extra = makeGarcom({ id: 'g-8', cor: '' })
    const all = [...garcons, extra]
    expect(garcomCor(extra, all)).toBe(GARCOM_CORES[0])
  })
})

describe('initials', () => {
  it('retorna iniciais de nome completo', () => {
    expect(initials('Pedro Alves')).toBe('PA')
  })

  it('retorna apenas primeira inicial para nome unico', () => {
    expect(initials('Marina')).toBe('M')
  })

  it('trunca para no maximo 2 iniciais', () => {
    expect(initials('Ana Maria Silva')).toBe('AM')
  })

  it('retorna uppercase', () => {
    expect(initials('joao pedro')).toBe('JP')
  })
})

describe('urgencyLevel', () => {
  const now = Date.now()

  it('retorna 0 quando mesa nao esta ocupada', () => {
    expect(urgencyLevel(makeMesa({ status: 'livre' }), makeComanda(), now)).toBe(0)
  })

  it('retorna 0 quando comanda e undefined', () => {
    expect(urgencyLevel(makeMesa({ status: 'ocupada' }), undefined, now)).toBe(0)
  })

  it('retorna 0 quando comanda tem menos de 30 minutos', () => {
    const comanda = makeComanda({ abertaEm: new Date(now - 20 * 60_000) })
    expect(urgencyLevel(makeMesa({ status: 'ocupada' }), comanda, now)).toBe(0)
  })

  it('retorna 1 quando comanda tem 30-59 minutos', () => {
    const comanda = makeComanda({ abertaEm: new Date(now - 35 * 60_000) })
    expect(urgencyLevel(makeMesa({ status: 'ocupada' }), comanda, now)).toBe(1)
  })

  it('retorna 2 quando comanda tem 60-89 minutos', () => {
    const comanda = makeComanda({ abertaEm: new Date(now - 75 * 60_000) })
    expect(urgencyLevel(makeMesa({ status: 'ocupada' }), comanda, now)).toBe(2)
  })

  it('retorna 3 quando comanda tem 90+ minutos', () => {
    const comanda = makeComanda({ abertaEm: new Date(now - 100 * 60_000) })
    expect(urgencyLevel(makeMesa({ status: 'ocupada' }), comanda, now)).toBe(3)
  })

  it('retorna 1 exatamente nos 30 minutos', () => {
    const comanda = makeComanda({ abertaEm: new Date(now - 30 * 60_000) })
    expect(urgencyLevel(makeMesa({ status: 'ocupada' }), comanda, now)).toBe(1)
  })

  it('retorna 2 exatamente nos 60 minutos', () => {
    const comanda = makeComanda({ abertaEm: new Date(now - 60 * 60_000) })
    expect(urgencyLevel(makeMesa({ status: 'ocupada' }), comanda, now)).toBe(2)
  })

  it('retorna 3 exatamente nos 90 minutos', () => {
    const comanda = makeComanda({ abertaEm: new Date(now - 90 * 60_000) })
    expect(urgencyLevel(makeMesa({ status: 'ocupada' }), comanda, now)).toBe(3)
  })
})

describe('urgencyBorderColor', () => {
  it('retorna string vazia para nivel 0', () => {
    expect(urgencyBorderColor(0)).toBe('')
  })

  it('retorna cor amber clara para nivel 1', () => {
    expect(urgencyBorderColor(1)).toContain('251,191,36')
  })

  it('retorna cor amber para nivel 2', () => {
    expect(urgencyBorderColor(2)).toContain('251,191,36')
    expect(urgencyBorderColor(2)).not.toBe(urgencyBorderColor(1))
  })

  it('retorna cor vermelha para nivel 3', () => {
    expect(urgencyBorderColor(3)).toContain('248,113,113')
  })
})

describe('urgencyShadow', () => {
  it('retorna undefined para nivel 0', () => {
    expect(urgencyShadow(0)).toBeUndefined()
  })

  it('retorna undefined para nivel 1', () => {
    expect(urgencyShadow(1)).toBeUndefined()
  })

  it('retorna sombra amber para nivel 2', () => {
    expect(urgencyShadow(2)).toContain('251,191,36')
  })

  it('retorna sombra vermelha para nivel 3', () => {
    expect(urgencyShadow(3)).toContain('248,113,113')
  })
})

describe('resolveMesaComanda', () => {
  it('retorna comanda quando mesa tem comandaId correspondente', () => {
    const comanda = makeComanda({ id: 'c-1' })
    const map = new Map([['c-1', comanda]])
    const mesa = makeMesa({ comandaId: 'c-1' })

    expect(resolveMesaComanda(mesa, map)).toBe(comanda)
  })

  it('retorna undefined quando mesa nao tem comandaId', () => {
    const map = new Map([['c-1', makeComanda()]])
    const mesa = makeMesa({ comandaId: undefined })

    expect(resolveMesaComanda(mesa, map)).toBeUndefined()
  })

  it('retorna undefined quando comandaId nao esta no mapa', () => {
    const map = new Map<string, Comanda>()
    const mesa = makeMesa({ comandaId: 'c-missing' })

    expect(resolveMesaComanda(mesa, map)).toBeUndefined()
  })
})
