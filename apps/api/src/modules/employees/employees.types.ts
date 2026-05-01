import type { Employee } from '@prisma/client'
import type { EmployeeRecord } from '@contracts/contracts'

export function toEmployeeRecord(
  employee: Employee & { loginUserId?: string | null; passwordHash?: string | null },
): EmployeeRecord {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    displayName: employee.displayName,
    active: employee.active,
    hasLogin: Boolean(employee.passwordHash),
    salarioBase: Number(employee.salarioBase),
    percentualVendas: Number(employee.percentualVendas),
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  }
}
