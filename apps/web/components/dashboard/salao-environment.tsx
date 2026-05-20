'use client'

import { CreateMesaModal, EditMesaModal } from './salao'
import { LegacySalaoKpis, SalaoHeader, SalaoTopBar } from './salao-environment-chrome'
import { useSalaoEnvironmentController } from './salao-environment.controller'
import type { SalaoEnvironmentProps } from './salao-environment.model'
import { SalaoLabPanels } from './salao-lab-panels'
import { ComandasTableView } from './salao-comandas-view'
import { ConfiguracaoView } from './salao-configuracao-view'
import { OperacionalView } from './salao-operacional-view'
import { PlantaView } from './salao-planta-view'

type SalaoController = ReturnType<typeof useSalaoEnvironmentController>

export function SalaoEnvironment({
  initialView = 'operacional',
  onOpenPdvFromMesa,
  onViewChange,
  surface = 'legacy',
}: Readonly<SalaoEnvironmentProps>) {
  const controller = useSalaoEnvironmentController({ initialView, onOpenPdvFromMesa, onViewChange })

  return (
    <section className="space-y-6">
      <SalaoHeader stats={controller} surface={surface} />
      {surface === 'legacy' ? <LegacySalaoKpis stats={controller} totalMesas={controller.liveMesas.length} /> : null}
      <SalaoTopBar
        stats={controller}
        view={controller.view}
        onCreate={controller.openCreate}
        onViewChange={controller.setSalaoView}
      />
      <SalaoActiveView controller={controller} onOpenPdvFromMesa={onOpenPdvFromMesa} />
      {surface === 'lab' ? <SalaoLabPanels stats={controller} totalMesas={controller.liveMesas.length} /> : null}
      <SalaoModals controller={controller} />
    </section>
  )
}

function SalaoActiveView({
  controller,
  onOpenPdvFromMesa,
}: Readonly<{
  controller: SalaoController
  onOpenPdvFromMesa: SalaoEnvironmentProps['onOpenPdvFromMesa']
}>) {
  if (controller.view === 'operacional') {
    return <OperacionalView {...buildOperacionalProps(controller, onOpenPdvFromMesa)} />
  }

  if (controller.view === 'comandas') {
    return <ComandasTableView {...buildComandasProps(controller, onOpenPdvFromMesa)} />
  }

  if (controller.view === 'configuracao') {
    return <ConfiguracaoView {...buildConfiguracaoProps(controller)} />
  }

  return <PlantaView {...buildPlantaProps(controller)} />
}

function SalaoModals({ controller }: Readonly<{ controller: SalaoController }>) {
  return (
    <>
      {controller.showCreate ? (
        <CreateMesaModal
          error={controller.formError}
          form={controller.createForm}
          isPending={controller.createMutation.isPending}
          onChange={controller.setCreateForm}
          onClose={() => {
            controller.setShowCreate(false)
            controller.setFormError(null)
          }}
          onSubmit={(event) => void controller.onCreateSubmit(event)}
        />
      ) : null}

      {controller.editingMesa ? (
        <EditMesaModal
          error={controller.formError}
          form={controller.editForm}
          isPending={controller.updateMutation.isPending}
          mesaLabel={controller.editingMesa.label}
          onChange={controller.setEditForm}
          onClose={() => {
            controller.setEditingMesa(null)
            controller.setFormError(null)
          }}
          onSubmit={controller.onEditSubmit}
        />
      ) : null}
    </>
  )
}

function buildOperacionalProps(
  controller: SalaoController,
  onOpenPdvFromMesa: SalaoEnvironmentProps['onOpenPdvFromMesa'],
) {
  return {
    garcomNames: controller.garcomNames,
    isLoading: controller.liveLoading,
    liveComandas: controller.liveComandas,
    liveMesas: controller.liveMesas,
    onOpenPdvFromMesa: onOpenPdvFromMesa ? controller.openPdvFromMesa : undefined,
    referenceTime: controller.liveReferenceTime,
  }
}

function buildComandasProps(
  controller: SalaoController,
  onOpenPdvFromMesa: SalaoEnvironmentProps['onOpenPdvFromMesa'],
) {
  return {
    comandas: controller.liveComandas,
    isLoading: controller.liveLoading,
    liveMesas: controller.liveMesas,
    onOpenPdvFromMesa,
  }
}

function buildConfiguracaoProps(controller: SalaoController) {
  return {
    activeMesas: controller.activeMesas,
    inactiveMesas: controller.inactiveMesas,
    isPending: controller.updateMutation.isPending,
    mesasLoading: controller.mesasLoading,
    onCreate: controller.openCreate,
    onEdit: controller.openEdit,
    onToggle: (mesa: Parameters<SalaoController['openEdit']>[0]) =>
      controller.updateMutation.mutate({ id: mesa.id, body: { active: !mesa.active } }),
  }
}

function buildPlantaProps(controller: SalaoController) {
  return {
    activeMesas: controller.activeMesas,
    canvasRef: controller.canvasRef,
    dragging: controller.dragging,
    dragPosition: controller.dragPosition,
    getMesaPosition: controller.getMesaPosition,
    handlePointerDown: controller.handlePointerDown,
    mesasLoading: controller.mesasLoading,
  }
}
