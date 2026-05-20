import type { ReplaceComandaPayload } from '@/lib/api'
import type { SaveComandaPayload } from './comanda-modal'
import type { Comanda, ComandaItem, ComandaStatus, Mesa } from './pdv-types'
import { normalizeTableLabel } from './normalize-table-label'
import { toOperationAmounts } from './pdv-operations'

export function buildPdvSectionCopy(variant: 'grid' | 'comandas' | 'cobranca') {
  return {
    grid: {
      eyebrow: 'Operação viva',
      title: 'Comandas em andamento',
      description: 'Abra uma comanda e mova cada etapa sem repetir leitura no resto da tela.',
    },
    comandas: {
      eyebrow: 'Mesas e balcão',
      title: 'Fila de atendimento',
      description: 'Use as colunas para acompanhar o que está aberto, em preparo e pronto para fechar.',
    },
    cobranca: {
      eyebrow: 'Cobrança ativa',
      title: 'Fechamento por comanda',
      description: 'Abra a comanda da coluna para revisar itens, desconto e cobrança em uma única superfície.',
    },
  }[variant]
}

export function buildComandasByStatus(comandas: Comanda[]) {
  const grouped: Record<ComandaStatus, Comanda[]> = {
    aberta: [],
    em_preparo: [],
    pronta: [],
    cancelada: [],
    fechada: [],
  }

  comandas.forEach((comanda) => {
    grouped[comanda.status].push(comanda)
  })

  return grouped
}

export function resolveSelectedMesa(mesas: Mesa[], mesaLabel?: string | null) {
  return mesas.find((mesa) => normalizeTableLabel(mesa.numero) === normalizeTableLabel(mesaLabel)) ?? null
}

export function buildPersistedDraft(editingComanda: Comanda | null, data: SaveComandaPayload): Comanda {
  return {
    id: editingComanda?.id ?? '',
    status: editingComanda?.status ?? 'aberta',
    mesa: normalizeTableLabel(data.mesa),
    clienteNome: normalizeOptionalText(data.clienteNome),
    clienteDocumento: normalizeOptionalText(data.clienteDocumento),
    notes: normalizeOptionalText(data.notes),
    itens: data.itens,
    desconto: data.desconto,
    acrescimo: data.acrescimo,
    abertaEm: editingComanda?.abertaEm ?? new Date(),
  }
}

function mapComandaItems(items: ComandaItem[]) {
  return items.map((item) => ({
    productId: item.produtoId.startsWith('manual-') ? undefined : item.produtoId,
    productName: item.produtoId.startsWith('manual-') ? item.nome : undefined,
    quantity: item.quantidade,
    unitPrice: item.precoUnitario,
    notes: item.observacao,
  }))
}

export function buildOpenComandaPayload(args: {
  data: SaveComandaPayload
  editingComanda: Comanda | null
  mesaPreSelected: Mesa | null
  mesas: Mesa[]
}): ReplaceComandaPayload {
  const draft = buildPersistedDraft(args.editingComanda, args.data)
  const amounts = toOperationAmounts(draft)
  const selectedMesa = resolveSelectedMesa(args.mesas, args.data.mesa)
  const mesaId = resolveTrustedMesaId({
    editingComanda: args.editingComanda,
    mesaPreSelected: args.mesaPreSelected,
    selectedMesa,
    tableLabel: args.data.mesa,
  })

  return {
    tableLabel: normalizeTableLabel(args.data.mesa),
    mesaId,
    customerName: normalizeOptionalText(args.data.clienteNome),
    customerDocument: normalizeOptionalText(args.data.clienteDocumento),
    notes: normalizeOptionalText(args.data.notes),
    items: mapComandaItems(args.data.itens),
    discountAmount: amounts.discountAmount,
    serviceFeeAmount: amounts.serviceFeeAmount,
  }
}

function normalizeOptionalText(value?: string | null) {
  return value?.trim() || undefined
}

function resolveTrustedMesaId({
  editingComanda,
  mesaPreSelected,
  selectedMesa,
  tableLabel,
}: {
  editingComanda: Comanda | null
  mesaPreSelected: Mesa | null
  selectedMesa: Mesa | null
  tableLabel: string
}) {
  const candidate = editingComanda ? selectedMesa : (mesaPreSelected ?? selectedMesa)
  if (!candidate || isLabelOnlyMesaId(candidate, tableLabel)) {
    return undefined
  }

  return candidate.id
}

function isLabelOnlyMesaId(mesa: Mesa, tableLabel: string) {
  return normalizeTableLabel(mesa.id) === normalizeTableLabel(tableLabel)
}
