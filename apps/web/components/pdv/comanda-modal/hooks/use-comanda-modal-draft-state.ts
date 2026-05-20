'use client'

import { useCallback, useState } from 'react'
import type { Comanda, ComandaItem } from '../../pdv-types'
import { addOrIncrementItem } from '../helpers'
import type { SimpleProduct } from '../types'
import { useComandaModalDerivedState } from './use-comanda-modal-derived-state'

type UseComandaModalDraftStateArgs = Readonly<{
  comanda?: Comanda | null
  initialMesa?: string
}>

export function useComandaModalDraftState({ comanda, initialMesa }: UseComandaModalDraftStateArgs) {
  const initial = resolveInitialDraftState(comanda, initialMesa)
  const [mesa, setMesa] = useState(initial.mesa)
  const [clienteNome, setClienteNome] = useState(initial.clienteNome)
  const [clienteDocumento, setClienteDocumento] = useState(initial.clienteDocumento)
  const [notes, setNotes] = useState(initial.notes)
  const [itens, setItens] = useState<ComandaItem[]>(initial.itens)
  const [desconto, setDesconto] = useState(initial.desconto)
  const [acrescimo, setAcrescimo] = useState(initial.acrescimo)
  const derived = useComandaModalDerivedState({
    acrescimo,
    clienteDocumento,
    clienteNome,
    comanda,
    desconto,
    itens,
    mesa,
    notes,
  })

  const addItem = useCallback((product: SimpleProduct) => {
    setItens((prev) => addOrIncrementItem(prev, product))
  }, [])

  const changeQty = useCallback((produtoId: string, delta: number) => {
    setItens((prev) =>
      prev
        .map((item) => (item.produtoId === produtoId ? { ...item, quantidade: item.quantidade + delta } : item))
        .filter((item) => item.quantidade > 0),
    )
  }, [])

  return {
    acrescimo,
    addItem,
    changeQty,
    clienteDocumento,
    clienteNome,
    desconto,
    itens,
    mesa,
    notes,
    setAcrescimo,
    setClienteDocumento,
    setClienteNome,
    setDesconto,
    setItens,
    setMesa,
    setNotes,
    ...derived,
  }
}

function resolveInitialDraftState(comanda?: Comanda | null, initialMesa?: string) {
  if (!comanda) {
    return {
      acrescimo: 0,
      clienteDocumento: '',
      clienteNome: '',
      desconto: 0,
      itens: [],
      mesa: initialMesa ?? '',
      notes: '',
    }
  }

  return {
    acrescimo: comanda.acrescimo ?? 0,
    clienteDocumento: comanda.clienteDocumento ?? '',
    clienteNome: comanda.clienteNome ?? '',
    desconto: comanda.desconto ?? 0,
    itens: comanda.itens ?? [],
    mesa: comanda.mesa ?? initialMesa ?? '',
    notes: comanda.notes ?? '',
  }
}
