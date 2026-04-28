type SalaoInstructionsProps = {
  allowStatusDragging: boolean
}

export function SalaoInstructions({ allowStatusDragging }: Readonly<SalaoInstructionsProps>) {
  return (
    <p className="text-xs text-[var(--text-soft)]">
      {allowStatusDragging
        ? 'Livre→Ocupada: abre comanda · Livre→Reservada: reserva por 2h · Reservada→Livre: cancela reserva · selecione garçom para atribuir (ESC cancela) · hover para ver itens'
        : 'O estado das mesas acompanha a comanda real · selecione um garçom para redistribuir o atendimento · hover na comanda para ver os itens'}
    </p>
  )
}
