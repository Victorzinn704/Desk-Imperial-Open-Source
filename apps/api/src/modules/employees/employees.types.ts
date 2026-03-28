import type { Employee } from '@prisma/client'

export type EmployeeRecord = {
  id: string
  employeeCode: string
  displayName: string
  active: boolean
  hasLogin: boolean
  salarioBase: number
  percentualVendas: number
  createdAt: string
  updatedAt: string
}

export function toEmployeeRecord(
  employee: Employee & { loginUserId?: string | null; passwordHash?: string | null },
): EmployeeRecord {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    displayName: employee.displayName,
    active: employee.active,
    hasLogin: Boolean(employee.passwordHash ?? employee.loginUserId),
    salarioBase: Number(employee.salarioBase),
    percentualVendas: Number(employee.percentualVendas),
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  }
}
