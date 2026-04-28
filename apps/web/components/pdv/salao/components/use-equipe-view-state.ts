'use client'

import { useMemo, useState } from 'react'
import { type Comanda, type Mesa } from '../../pdv-types'

type UseEquipeViewStateInput = {
  comandas: Comanda[]
  mesas: Mesa[]
  onAddGarcom: (nome: string) => void
}

export function useEquipeViewState({ comandas, mesas, onAddGarcom }: Readonly<UseEquipeViewStateInput>) {
  const [showAdd, setShowAdd] = useState(false)
  const [newNome, setNewNome] = useState('')
  const semGarcom = useMemo(() => mesas.filter((mesa) => !mesa.garcomId && mesa.status !== 'livre'), [mesas])
  const comandaById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])

  const openAdd = () => setShowAdd(true)
  const closeAdd = () => setShowAdd(false)
  const confirmAdd = () => {
    onAddGarcom(newNome.trim())
    setNewNome('')
    setShowAdd(false)
  }

  return {
    closeAdd,
    comandaById,
    confirmAdd,
    newNome,
    openAdd,
    semGarcom,
    setNewNome,
    showAdd,
  }
}
