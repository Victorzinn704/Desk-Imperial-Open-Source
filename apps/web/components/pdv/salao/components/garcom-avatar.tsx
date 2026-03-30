import type { Garcom } from '../../pdv-types'
import { initials } from '../constants'

export interface GarcomAvatarProps {
  garcom: Garcom
  size?: number
}

export function GarcomAvatar({ garcom, size = 22 }: GarcomAvatarProps) {
  return (
    <span
      className="flex items-center justify-center rounded-full font-bold text-black shrink-0"
      style={{ width: size, height: size, background: garcom.cor, fontSize: size * 0.38 }}
    >
      {initials(garcom.nome)}
    </span>
  )
}
