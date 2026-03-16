import type { Employee } from '@prisma/client'

export type EmployeeRecord = {
  id: string
  employeeCode: string
  displayName: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export function toEmployeeRecord(employee: Employee): EmployeeRecord {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    displayName: employee.displayName,
    active: employee.active,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  }
}
