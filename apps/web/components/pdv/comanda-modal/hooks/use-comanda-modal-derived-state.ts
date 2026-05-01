'use client'

import { useMemo } from 'react'
import { validateDocument } from '@/lib/document-validation'
import { calcTotal, type Comanda, type ComandaItem } from '../../pdv-types'
import { resolveDocLabel } from '../helpers'

type UseComandaModalDerivedStateArgs = Readonly<{
  acrescimo: number
  clienteDocumento: string
  clienteNome: string
  comanda?: Comanda | null
  desconto: number
  itens: ComandaItem[]
  mesa: string
  notes: string
}>

export function useComandaModalDerivedState({
  acrescimo,
  clienteDocumento,
  clienteNome,
  comanda,
  desconto,
  itens,
  mesa,
  notes,
}: UseComandaModalDerivedStateArgs) {
  const docValidation = validateDocument(clienteDocumento)
  const docLabel = resolveDocLabel(clienteDocumento)
  const bruto = useMemo(() => itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0), [itens])
  const itemCount = useMemo(() => itens.reduce((sum, item) => sum + item.quantidade, 0), [itens])
  const draftComanda = useMemo<Comanda>(
    () => ({
      id: comanda?.id ?? '',
      status: comanda?.status ?? 'aberta',
      mesa,
      clienteNome,
      clienteDocumento,
      notes,
      itens,
      desconto,
      acrescimo,
      abertaEm: comanda?.abertaEm ?? new Date(),
    }),
    [
      acrescimo,
      clienteDocumento,
      clienteNome,
      comanda?.abertaEm,
      comanda?.id,
      comanda?.status,
      desconto,
      itens,
      mesa,
      notes,
    ],
  )
  const total = useMemo(() => calcTotal(draftComanda), [draftComanda])

  return {
    bruto,
    docLabel,
    docValidation,
    draftStatus: draftComanda.status,
    itemCount,
    total,
  }
}
