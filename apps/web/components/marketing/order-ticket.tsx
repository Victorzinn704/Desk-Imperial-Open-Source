'use client'

import { motion } from 'framer-motion'

const lineItems = [
  { label: 'Picanha 300g', value: 'R$ 89,00' },
  { label: 'Caipirinha artesanal', value: 'R$ 24,50' },
  { label: 'Pão de alho (2×)', value: 'R$ 16,00' },
  { label: 'Água mineral', value: 'R$ 8,00' },
]

interface OrderTicketProps {
  animate?: boolean
}

export function OrderTicket({ animate = true }: OrderTicketProps) {
  return (
    <div className="data-record">
      <div className="data-record__header">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Mesa 12 — João Pedro</p>
          <p className="mt-0.5 text-xs text-[var(--text-soft)]">14h32 · Comanda #0042</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
          <span className="data-record__status-dot" />
          Em preparo
        </span>
      </div>

      <div className="data-record__body">
        {lineItems.map((item, index) => (
          <motion.div
            className="data-record__row"
            initial={animate ? { opacity: 0, x: -10 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.7,
              delay: animate ? 0.3 + index * 0.1 : 0,
              ease: [0.22, 1, 0.36, 1],
            }}
            key={item.label}
          >
            <span>{item.label}</span>
            <span className="tabular-nums text-[var(--text-muted)]">{item.value}</span>
          </motion.div>
        ))}

        <motion.div
          className="data-record__row data-record__row--total"
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: animate ? 0.85 : 0, ease: 'easeOut' }}
        >
          <span>Total</span>
          <span className="tabular-nums">R$ 187,50</span>
        </motion.div>
      </div>

      <div className="data-record__footer">
        <span>Vendedor: Rafael M.</span>
        <span>PDV · Desk Imperial</span>
      </div>
    </div>
  )
}
