import { LabPageHeader } from '@/components/design-lab/lab-primitives'
import { PortfolioProductsPanel } from './portfolio-products-panel'
import type { PortfolioEnvironmentViewModel } from './portfolio-environment.controller'
import {
  PortfolioActionPanel,
  PortfolioHeaderBoard,
  PortfolioOperationalPanel,
  PortfolioRadarPanel,
} from './portfolio-environment.panels'
import { PortfolioProductWorkbench, PortfolioSaleWorkbench } from './portfolio-environment.workbenches'

export function PortfolioEnvironmentView({
  actions,
  content,
  productWorkbench,
  productsPanel,
  saleWorkbench,
}: Readonly<PortfolioEnvironmentViewModel>) {
  return (
    <section className="space-y-5">
      <LabPageHeader
        description="Estoque, margem e giro do catálogo."
        eyebrow="Estoque e margem"
        title="Portfolio de produtos"
      >
        <PortfolioHeaderBoard metrics={content.headerMetrics} />
      </LabPageHeader>

      <div className="grid gap-5 min-[1080px]:grid-cols-[360px_minmax(0,1fr)] min-[1080px]:items-start xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-5">
          <PortfolioActionPanel
            model={content.actionPanel}
            onOpenProduct={actions.openNewProductSurface}
            onOpenSale={actions.openDeliverySaleSurface}
          />
          <PortfolioOperationalPanel model={content.operationalPanel} />
        </div>
        <PortfolioRadarPanel model={content.radarPanel} />
      </div>

      <PortfolioProductsPanel {...productsPanel} />

      {productWorkbench ? (
        <PortfolioProductWorkbench
          state={productWorkbench}
          onClose={actions.closeSurface}
          onSubmit={actions.submitProduct}
        />
      ) : null}

      {saleWorkbench ? (
        <PortfolioSaleWorkbench
          state={saleWorkbench}
          onClose={actions.closeSurface}
          onModeChange={actions.changeSaleMode}
          onSubmit={actions.submitSale}
        />
      ) : null}
    </section>
  )
}
