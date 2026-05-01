'use client'

import { PdvComandasView } from './pdv-wireframe-comandas-view'
import { PdvChargeView } from './pdv-wireframe-charge-view'
import { usePdvWireframeEnvironmentData } from './pdv-wireframe-environment.data'
import { PdvGridView } from './pdv-wireframe-grid-view'
import { PdvKitchenView } from './pdv-wireframe-kitchen-view'
import type { PdvWireframeEnvironmentProps } from './pdv-wireframe-environment.types'

export function PdvWireframeEnvironment({
  mesaIntent = null,
  user,
  variant = 'grid',
}: Readonly<PdvWireframeEnvironmentProps>) {
  const data = usePdvWireframeEnvironmentData({ mesaIntent, user, variant })

  switch (variant) {
    case 'comandas':
      return <PdvComandasView comandas={data.openComandas} currency={data.currency} />
    case 'kds':
      return <PdvKitchenView isLoading={data.kitchenLoading} tickets={data.kitchenTickets} />
    case 'cobranca':
      return <PdvChargeView comanda={data.chargeComanda} currency={data.currency} />
    case 'grid':
    default:
      return (
        <PdvGridView
          activeCategory={data.activeCategory}
          categories={data.categories}
          comanda={data.selectedComanda}
          currency={data.currency}
          products={data.filteredProducts}
          onCategoryChange={data.setActiveCategory}
        />
      )
  }
}
