import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OwnerTodayView } from './owner-today-view'

describe('OwnerTodayView', () => {
  it('prioriza a cozinha quando existe fila e mantém as ações principais visíveis', () => {
    const onOpenPdv = vi.fn()
    const onOpenKitchen = vi.fn()

    render(
      <OwnerTodayView
        activeComandas={4}
        errorMessage={null}
        garconRanking={[{ nome: 'Marina', valor: 320, comandas: 4 }]}
        garconSnapshots={[{ nome: 'Marina', valor: 320, comandas: 4, abertasAgora: 2 }]}
        isLoading={false}
        isOffline={false}
        kitchenBadge={3}
        mesasLivres={2}
        mesasOcupadas={5}
        ticketMedio={45}
        todayOrderCount={9}
        todayRevenue={405}
        topProdutos={[{ nome: 'Cerveja 600', qtd: 8, valor: 240 }]}
        onOpenComandas={() => undefined}
        onOpenFullDashboard={() => undefined}
        onOpenKitchen={onOpenKitchen}
        onOpenPdv={onOpenPdv}
        onOpenQuickRegister={() => undefined}
      />,
    )

    expect(screen.getByText(/itens pressionando a cozinha/i)).toBeInTheDocument()
    expect(screen.getByTestId('owner-kpi-receita')).toHaveTextContent('405,00')
    expect(screen.getByText('Ranking garçons')).toBeInTheDocument()
    expect(screen.getByText('Top produtos')).toBeInTheDocument()
    expect(screen.getByText(/Receita/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Abrir PDV/i }))
    fireEvent.click(screen.getByRole('button', { name: /Ver cozinha/i }))

    expect(onOpenPdv).toHaveBeenCalled()
    expect(onOpenKitchen).toHaveBeenCalled()
  })

  it('mostra leitura estável e estados vazios quando não há movimento', () => {
    render(
      <OwnerTodayView
        activeComandas={0}
        errorMessage={null}
        garconRanking={[]}
        garconSnapshots={[]}
        isLoading={false}
        isOffline={false}
        kitchenBadge={0}
        mesasLivres={10}
        mesasOcupadas={0}
        ticketMedio={0}
        todayOrderCount={0}
        todayRevenue={0}
        topProdutos={[]}
        onOpenComandas={() => undefined}
        onOpenFullDashboard={() => undefined}
        onOpenKitchen={() => undefined}
        onOpenPdv={() => undefined}
        onOpenQuickRegister={() => undefined}
      />,
    )

    expect(screen.getByText('estável')).toBeInTheDocument()
    expect(screen.getByText(/turno ainda sem pressão operacional/i)).toBeInTheDocument()
    expect(screen.getByText(/Nenhum garçom com vendas hoje/i)).toBeInTheDocument()
    expect(screen.getByText(/Nenhum produto vendido hoje ainda/i)).toBeInTheDocument()
  })

  it('permite filtrar a leitura curta do turno por garçom', () => {
    render(
      <OwnerTodayView
        activeComandas={4}
        errorMessage={null}
        garconRanking={[
          { nome: 'Marina', valor: 320, comandas: 4 },
          { nome: 'Paulo', valor: 180, comandas: 2 },
        ]}
        garconSnapshots={[
          { nome: 'Marina', valor: 320, comandas: 4, abertasAgora: 2 },
          { nome: 'Paulo', valor: 180, comandas: 2, abertasAgora: 1 },
        ]}
        isLoading={false}
        isOffline={false}
        kitchenBadge={0}
        mesasLivres={2}
        mesasOcupadas={5}
        ticketMedio={45}
        todayOrderCount={9}
        todayRevenue={405}
        topProdutos={[{ nome: 'Cerveja 600', qtd: 8, valor: 240 }]}
        onOpenComandas={() => undefined}
        onOpenFullDashboard={() => undefined}
        onOpenKitchen={() => undefined}
        onOpenPdv={() => undefined}
        onOpenQuickRegister={() => undefined}
      />,
    )

    fireEvent.click(screen.getByTestId('owner-today-performer-paulo'))

    expect(screen.getByText(/Abertas agora/i)).toBeInTheDocument()
    expect(screen.getByTestId('owner-today-performer-paulo')).toBeInTheDocument()
    expect(screen.getAllByText(/R\$ 180,00/i).length).toBeGreaterThan(0)
  })
})
