import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MesaRecord } from '@contracts/contracts'
import { createMesa, fetchMesas, fetchOperationsLive, updateMesa } from '@/lib/api'
import { buildPdvComandas, buildPdvMesas } from '@/components/pdv/pdv-operations'
import type { Mesa } from '@/components/pdv/pdv-types'
import {
  type CreateForm,
  defaultCreateForm,
  type EditForm,
  LIVE_QUERY_KEY,
  QUERY_KEY,
  useMesaDrag,
  type View,
} from './salao'
import {
  buildGarcomNames,
  buildSalaoStats,
  FULL_LIVE_QUERY_KEY,
  mergeLiveMesasWithRecords,
  type SalaoEnvironmentProps,
  splitMesasByActiveState,
  toPdvMesaIntent,
} from './salao-environment.model'

type MesaUpdateBody = Parameters<typeof updateMesa>[1]

type MesaMutationState = {
  setCreateForm: (form: CreateForm) => void
  setEditingMesa: (mesa: MesaRecord | null) => void
  setFormError: (message: string | null) => void
  setShowCreate: (show: boolean) => void
}

export function useSalaoEnvironmentController({
  initialView,
  onOpenPdvFromMesa,
  onViewChange,
}: Pick<SalaoEnvironmentProps, 'initialView' | 'onOpenPdvFromMesa' | 'onViewChange'>) {
  const viewState = useSalaoView(initialView ?? 'operacional', onViewChange)
  const formState = useMesaFormState()
  const queries = useSalaoQueries(viewState.view)
  const queryClient = useQueryClient()
  const mutations = useMesaMutations({ queryClient, state: formState })
  const drag = useMesaDragController(mutations.updateMutation)
  const activeState = useMemo(() => splitMesasByActiveState(queries.mesas), [queries.mesas])
  const stats = useMemo(
    () => buildSalaoStats(queries.liveMesas, queries.liveComandas),
    [queries.liveComandas, queries.liveMesas],
  )
  const garcomNames = useMemo(() => buildGarcomNames(queries.liveData), [queries.liveData])

  return {
    ...viewState,
    ...formState,
    ...queries,
    ...activeState,
    ...stats,
    ...drag,
    createMutation: mutations.createMutation,
    openPdvFromMesa: usePdvMesaOpener(onOpenPdvFromMesa),
    updateMutation: mutations.updateMutation,
    onCreateSubmit: useCreateSubmit({
      createForm: formState.createForm,
      createMutation: mutations.createMutation,
      invalidate: mutations.invalidate,
      state: formState,
    }),
    onEditSubmit: useEditSubmit({
      editForm: formState.editForm,
      editingMesa: formState.editingMesa,
      state: formState,
      updateMutation: mutations.updateMutation,
    }),
    garcomNames,
  }
}

function useSalaoView(initialView: View, onViewChange: SalaoEnvironmentProps['onViewChange']) {
  const [view, setView] = useState<View>(initialView)

  useEffect(() => {
    setView(initialView)
  }, [initialView])

  const setSalaoView = useCallback(
    (nextView: View) => {
      setView(nextView)
      onViewChange?.(nextView)
    },
    [onViewChange],
  )

  return { setSalaoView, view }
}

function useMesaFormState() {
  const [showCreate, setShowCreate] = useState(false)
  const [editingMesa, setEditingMesa] = useState<MesaRecord | null>(null)
  const [createForm, setCreateForm] = useState<CreateForm>(defaultCreateForm)
  const [editForm, setEditForm] = useState<EditForm>({ label: '', capacity: '4', section: '' })
  const [formError, setFormError] = useState<string | null>(null)

  const openCreate = useCallback(() => {
    setCreateForm(defaultCreateForm())
    setFormError(null)
    setShowCreate(true)
  }, [])

  const openEdit = useCallback((mesa: MesaRecord) => {
    setEditForm({ label: mesa.label, capacity: String(mesa.capacity), section: mesa.section ?? '' })
    setEditingMesa(mesa)
    setFormError(null)
  }, [])

  return {
    createForm,
    editForm,
    editingMesa,
    formError,
    openCreate,
    openEdit,
    setCreateForm,
    setEditForm,
    setEditingMesa,
    setFormError,
    setShowCreate,
    showCreate,
  }
}

function useSalaoQueries(view: View) {
  const { data: mesas = [], isLoading: mesasLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchMesas,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const compact = useOperationsLiveQuery({
    compactMode: true,
    enabled: view === 'operacional',
    queryKey: LIVE_QUERY_KEY,
  })
  const detailed = useOperationsLiveQuery({ enabled: view === 'comandas', queryKey: FULL_LIVE_QUERY_KEY })
  const liveQuery = view === 'comandas' ? detailed : compact

  return {
    liveComandas: buildPdvComandas(liveQuery.data),
    liveData: liveQuery.data,
    liveLoading: liveQuery.isLoading,
    liveMesas: mergeLiveMesasWithRecords(buildPdvMesas(liveQuery.data), mesas),
    liveReferenceTime: liveQuery.dataUpdatedAt,
    mesas,
    mesasLoading,
  }
}

function useOperationsLiveQuery(input: { compactMode?: boolean; enabled: boolean; queryKey: readonly string[] }) {
  return useQuery({
    queryKey: input.queryKey,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false, compactMode: input.compactMode }),
    refetchInterval: 15_000,
    staleTime: 10_000,
    enabled: input.enabled,
    refetchOnWindowFocus: false,
  })
}

function useMesaMutations({ queryClient, state }: { queryClient: QueryClient; state: MesaMutationState }) {
  const invalidate = useCallback(() => invalidateSalaoQueries(queryClient), [queryClient])
  const createMutation = useMutation({
    mutationFn: createMesa,
    onSuccess: () => {
      invalidate()
      state.setShowCreate(false)
      state.setCreateForm(defaultCreateForm())
      state.setFormError(null)
    },
    onError: (error) => state.setFormError(error instanceof Error ? error.message : 'Erro ao criar mesa'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { body: MesaUpdateBody; id: string }) => updateMesa(id, body),
    onSuccess: () => {
      invalidate()
      state.setEditingMesa(null)
      state.setFormError(null)
    },
    onError: (error) => state.setFormError(error instanceof Error ? error.message : 'Erro ao atualizar mesa'),
  })

  return { createMutation, invalidate, updateMutation }
}

function useMesaDragController(updateMutation: ReturnType<typeof useMesaMutations>['updateMutation']) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const onPositionSave = useCallback(
    (id: string, x: number, y: number) => updateMutation.mutate({ id, body: { positionX: x, positionY: y } }),
    [updateMutation],
  )

  return { canvasRef, ...useMesaDrag({ onPositionSave, canvasRef }) }
}

function usePdvMesaOpener(onOpenPdvFromMesa: SalaoEnvironmentProps['onOpenPdvFromMesa']) {
  return useCallback((mesa: Mesa) => onOpenPdvFromMesa?.(toPdvMesaIntent(mesa)), [onOpenPdvFromMesa])
}

function useCreateSubmit(input: {
  createForm: CreateForm
  createMutation: ReturnType<typeof useMesaMutations>['createMutation']
  invalidate: () => void
  state: MesaMutationState
}) {
  return useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      input.state.setFormError(null)
      await submitCreateForm(input)
    },
    [input],
  )
}

function useEditSubmit(input: {
  editForm: EditForm
  editingMesa: MesaRecord | null
  state: MesaMutationState
  updateMutation: ReturnType<typeof useMesaMutations>['updateMutation']
}) {
  return useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      submitEditForm(input)
    },
    [input],
  )
}

async function submitCreateForm(input: {
  createForm: CreateForm
  createMutation: ReturnType<typeof useMesaMutations>['createMutation']
  invalidate: () => void
  state: MesaMutationState
}) {
  if (input.createForm.mode === 'single') {
    return submitSingleMesa(input)
  }

  await submitBulkMesas(input)
}

function submitSingleMesa(input: {
  createForm: CreateForm
  createMutation: ReturnType<typeof useMesaMutations>['createMutation']
  state: MesaMutationState
}) {
  const payload = buildSingleMesaPayload(input.createForm)
  if (!payload) {
    input.state.setFormError('Nome é obrigatório')
    return
  }

  input.createMutation.mutate(payload)
}

async function submitBulkMesas(input: {
  createForm: CreateForm
  createMutation: ReturnType<typeof useMesaMutations>['createMutation']
  invalidate: () => void
  state: MesaMutationState
}) {
  const range = parseBulkRange(input.createForm)
  if (!range) {
    input.state.setFormError('Range inválido (máx 50 de uma vez)')
    return
  }

  for (let index = range.from; index <= range.to; index += 1) {
    await input.createMutation.mutateAsync(buildBulkMesaPayload(input.createForm, index)).catch(() => {})
  }

  input.invalidate()
  input.state.setShowCreate(false)
  input.state.setCreateForm(defaultCreateForm())
}

function submitEditForm(input: {
  editForm: EditForm
  editingMesa: MesaRecord | null
  state: MesaMutationState
  updateMutation: ReturnType<typeof useMesaMutations>['updateMutation']
}) {
  if (!input.editingMesa) {
    return
  }

  const payload = buildEditMesaPayload(input.editForm)
  if (!payload) {
    input.state.setFormError('Nome é obrigatório')
    return
  }

  input.updateMutation.mutate({ id: input.editingMesa.id, body: payload })
}

function buildSingleMesaPayload(form: CreateForm) {
  const label = form.label.trim()
  return label ? { label, capacity: parseCapacity(form.capacity), section: normalizeOptional(form.section) } : null
}

function buildEditMesaPayload(form: EditForm) {
  const label = form.label.trim()
  return label ? { label, capacity: parseCapacity(form.capacity), section: normalizeOptional(form.section) } : null
}

function buildBulkMesaPayload(form: CreateForm, index: number) {
  return {
    label: `${form.bulkPrefix.trim() || 'Mesa'} ${index}`,
    capacity: parseCapacity(form.capacity),
    section: normalizeOptional(form.section),
  }
}

function parseBulkRange(form: CreateForm) {
  const from = Number.parseInt(form.bulkFrom, 10)
  const to = Number.parseInt(form.bulkTo, 10)

  return Number.isNaN(from) || Number.isNaN(to) || from > to || to - from > 49 ? null : { from, to }
}

function parseCapacity(value: string) {
  const capacity = Number.parseInt(value, 10)
  return capacity > 0 ? capacity : 4
}

function normalizeOptional(value: string) {
  return value.trim() || undefined
}

function invalidateSalaoQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  void queryClient.invalidateQueries({ queryKey: LIVE_QUERY_KEY })
  void queryClient.invalidateQueries({ queryKey: FULL_LIVE_QUERY_KEY })
}
