export function OperationHeader() {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          2. Configure a operação
        </p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
          Defina moeda, vendedor e contexto da venda
        </h3>
      </div>
      <p className="max-w-xl text-sm leading-7 text-[var(--text-soft)]">
        Essa etapa alimenta o ranking da equipe, a análise por canal e o comportamento do pedido dentro do painel.
      </p>
    </div>
  )
}

export function BuyerHeader() {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          3. Identifique o comprador
        </p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
          Registre quem comprou e de onde saiu a venda
        </h3>
      </div>
      <p className="max-w-xl text-sm leading-7 text-[var(--text-soft)]">
        Esses dados sustentam mapa de vendas, compliance e leitura do cliente no financeiro.
      </p>
    </div>
  )
}
