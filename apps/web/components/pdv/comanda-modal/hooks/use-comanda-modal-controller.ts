'use client'

import type { Comanda } from '../../pdv-types'
import { useThermalPrinting } from '../../use-thermal-printing'
import { buildPrintableComanda } from '../helpers'
import type { SaveComandaPayload, SimpleProduct } from '../types'
import { useComandaModalDraftState } from './use-comanda-modal-draft-state'
import { useComandaModalPin } from './use-comanda-modal-pin'
import { useComandaModalPercentGuards } from './use-comanda-modal-percent-guards'
import { useComandaModalSave } from './use-comanda-modal-save'
import { useProductFilter } from './use-product-filter'

type UseComandaModalControllerArgs = Readonly<{
  busy: boolean
  comanda?: Comanda | null
  initialMesa?: string
  onClose: () => void
  onSave: (data: SaveComandaPayload) => Promise<Comanda>
  products: SimpleProduct[]
}>

export function useComandaModalController(args: UseComandaModalControllerArgs) {
  const { busy, comanda, initialMesa, onClose, onSave, products } = args
  const isEditing = Boolean(comanda)
  const draft = useComandaModalDraftState({ comanda, initialMesa })
  const pin = useComandaModalPin()
  const printer = useThermalPrinting()
  const filter = useProductFilter(products)
  const percentGuards = useComandaModalPercentGuards({
    acrescimo: draft.acrescimo,
    desconto: draft.desconto,
    requirePin: pin.requirePin,
    setAcrescimo: draft.setAcrescimo,
    setDesconto: draft.setDesconto,
  })
  const save = useComandaModalSave({
    acrescimo: draft.acrescimo,
    clienteDocumento: draft.clienteDocumento,
    clienteNome: draft.clienteNome,
    desconto: draft.desconto,
    isBusyGuard: busy,
    itens: draft.itens,
    mesa: draft.mesa,
    notes: draft.notes,
    onClose,
    onSave,
    printComanda: printer.printComanda,
    toPrintableComanda: buildPrintableComanda,
  })
  return {
    ...draft,
    ...percentGuards,
    ...pin,
    ...printer,
    ...save,
    categories: filter.categories,
    filteredProducts: filter.filtered,
    isEditing,
    search: filter.search,
    selectedCategory: filter.selectedCategory,
    setSearch: filter.setSearch,
    setSelectedCategory: filter.setSelectedCategory,
    showProducts: filter.showProducts,
    isBusy: busy || save.isSubmitting,
  }
}
