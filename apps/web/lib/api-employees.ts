import type { EmployeeRecord, EmployeesResponse } from '@contracts/contracts'

import { apiFetch } from './api-core'
import type { ApiBody } from './api-core'

export type { EmployeeRecord, EmployeesResponse } from '@contracts/contracts'

export type EmployeePayload = {
  employeeCode: string
  displayName: string
  temporaryPassword: string
}

export type UpdateEmployeePayload = {
  employeeCode?: string
  displayName?: string
  active?: boolean
  temporaryPassword?: string
  salarioBase?: number
  percentualVendas?: number
}

export async function fetchEmployees() {
  return apiFetch<EmployeesResponse>('/employees', {
    method: 'GET',
  })
}

export async function createEmployee(payload: EmployeePayload) {
  return apiFetch<{ employee: EmployeeRecord }>('/employees', {
    method: 'POST',
    body: payload as ApiBody,
  })
}

export async function updateEmployee(employeeId: string, payload: UpdateEmployeePayload) {
  return apiFetch<{ employee: EmployeeRecord }>(`/employees/${employeeId}`, {
    method: 'PATCH',
    body: payload as ApiBody,
  })
}

export async function archiveEmployee(employeeId: string) {
  return apiFetch<{ employee: EmployeeRecord }>(`/employees/${employeeId}`, {
    method: 'DELETE',
  })
}

export async function restoreEmployee(employeeId: string) {
  return apiFetch<{ employee: EmployeeRecord }>(`/employees/${employeeId}/restore`, {
    method: 'POST',
  })
}
