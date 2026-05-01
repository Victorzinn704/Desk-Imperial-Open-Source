import type { Comanda } from './pdv-types'

export type ComandasByStatus = Readonly<{
  aberta: Comanda[]
  em_preparo: Comanda[]
  pronta: Comanda[]
  fechada: Comanda[]
  cancelada: Comanda[]
}>
