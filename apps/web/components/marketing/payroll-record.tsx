'use client'

import { motion } from 'framer-motion'

interface PayrollRecordProps {
  animate?: boolean
}

export function PayrollRecord({ animate = true }: PayrollRecordProps) {
  return (
    <div className="data-record">
      <div className="data-record__header">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Lucas Ferreira — Vendedor</p>
          <p className="mt-0.5 text-xs text-[var(--text-soft)]">Março 2026 · Cálculo automático</p>
        </div>
        <span className="text-xs font-semibold text-[var(--success)]">Folha aprovada</span>
      </div>

      <div className="data-record__body">
        <motion.div
          className="data-record__row"
          initial={animate ? { opacity: 0, x: -10 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: animate ? 0.3 : 0, ease: [0.22, 1, 0.36, 1] }}
        >
          <span>Salário base</span>
          <span className="tabular-nums text-[var(--text-muted)]">R$ 2.800,00</span>
        </motion.div>

        <motion.div
          initial={animate ? { opacity: 0, x: -10 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: animate ? 0.42 : 0, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="data-record__row">
            <span>Comissão (1,8%)</span>
            <span className="tabular-nums text-[var(--text-muted)]">R$ 340,00</span>
          </div>
          <div className="data-record__row data-record__row--sub">
            <span>127 pedidos × R$ 148 médio = R$ 18.796 em vendas</span>
          </div>
        </motion.div>

        <motion.div
          className="data-record__row"
          initial={animate ? { opacity: 0, x: -10 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: animate ? 0.54 : 0, ease: [0.22, 1, 0.36, 1] }}
        >
          <span>Descontos</span>
          <span className="tabular-nums text-[var(--text-muted)]">R$ 0,00</span>
        </motion.div>

        <motion.div
          className="data-record__row data-record__row--total"
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: animate ? 0.9 : 0, ease: 'easeOut' }}
        >
          <span>Total líquido</span>
          <span className="tabular-nums">R$ 3.140,00</span>
        </motion.div>
      </div>

      <div className="data-record__footer">
        <span>Competência: março 2026</span>
        <span>Folha · Desk Imperial</span>
      </div>
    </div>
  )
}
