'use client'

import { LabPanel } from '@/components/design-lab/lab-primitives'
import { CaixaPanel } from '@/components/dashboard/caixa-panel'
import { PdvBoard } from '@/components/pdv/pdv-board'
import type { PdvMesaIntent } from '@/components/pdv/pdv-navigation-intent'
import type { PdvEnvironmentVariant } from './pdv-environment.model'
import { PdvKitchenQueuePanel, PdvLockedState, PdvOperationalHeader } from './pdv-environment.panels'
import { usePdvEnvironmentController } from './use-pdv-environment-controller'

type PdvEnvironmentProps = {
  mesaIntent?: PdvMesaIntent | null
  onConsumeMesaIntent?: () => void
  variant?: PdvEnvironmentVariant
}

export function PdvEnvironment({
  mesaIntent = null,
  onConsumeMesaIntent,
  variant = 'grid',
}: Readonly<PdvEnvironmentProps>) {
  const controller = usePdvEnvironmentController(variant)

  if (controller.isSessionLoading) {
    return (
      <LabPanel padding="md">
        <p className="text-sm text-[var(--text-soft)]">Carregando a sessão do PDV...</p>
      </LabPanel>
    )
  }

  if (!controller.user) {
    return <PdvLockedState error={controller.sessionError} heading={controller.heading} />
  }

  return (
    <section className="space-y-6">
      <PdvOperationalHeader
        dataUpdatedAt={controller.operationsUpdatedAt}
        description={controller.heading.description}
        eyebrow={controller.heading.eyebrow}
        isFetching={controller.operationsFetching}
        metrics={controller.metrics}
        title={controller.heading.title}
      />

      {controller.operationsError ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--danger)]">
            Não foi possível carregar a operação viva agora. {controller.operationsError}
          </p>
        </LabPanel>
      ) : null}

      <PdvVariantContent
        controller={controller}
        mesaIntent={mesaIntent}
        variant={variant}
        onConsumeMesaIntent={onConsumeMesaIntent}
      />
    </section>
  )
}

function PdvVariantContent({
  controller,
  mesaIntent,
  onConsumeMesaIntent,
  variant,
}: Readonly<{
  controller: ReturnType<typeof usePdvEnvironmentController>
  mesaIntent: PdvMesaIntent | null
  onConsumeMesaIntent?: () => void
  variant: PdvEnvironmentVariant
}>) {
  if (variant === 'kds') {
    return (
      <PdvKitchenQueuePanel items={controller.operationsView.timelineItems} loading={controller.operationsLoading} />
    )
  }

  if (variant === 'cobranca') {
    return (
      <div className="space-y-6">
        {controller.showExecutiveOperations ? <CaixaPanel operations={controller.operations} /> : null}
        <PdvBoard
          mesaIntent={mesaIntent}
          operations={controller.operations}
          products={controller.boardProducts}
          variant="cobranca"
          onConsumeMesaIntent={onConsumeMesaIntent}
        />
      </div>
    )
  }

  if (variant === 'comandas') {
    return (
      <PdvBoard
        mesaIntent={mesaIntent}
        operations={controller.operations}
        products={controller.boardProducts}
        variant="comandas"
        onConsumeMesaIntent={onConsumeMesaIntent}
      />
    )
  }

  return (
    <PdvBoard
      mesaIntent={mesaIntent}
      operations={controller.operations}
      products={controller.boardProducts}
      variant="grid"
      onConsumeMesaIntent={onConsumeMesaIntent}
    />
  )
}
