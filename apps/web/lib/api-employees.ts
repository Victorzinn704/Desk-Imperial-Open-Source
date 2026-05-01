import type { EmployeeRecord, EmployeesResponse } from '@contracts/contracts'

import { type ApiBody, apiFetch } from './api-core'

export type { EmployeeRecord, EmployeesResponse } from '@contracts/contracts'

export type EmployeeAccessCredentials = {
  employeeCode: string
  temporaryPassword: string
}

export type EmployeePayload = {
  displayName: string
}

export type UpdateEmployeePayload = {
  displayName?: string
  active?: boolean
  salarioBase?: number
  percentualVendas?: number
}

export async function fetchEmployees() {
  return apiFetch<EmployeesResponse>('/employees', {
    method: 'GET',
  })
}

export async function createEmployee(payload: EmployeePayload) {
  return apiFetch<{ employee: EmployeeRecord; credentials: EmployeeAccessCredentials }>('/employees', {
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

export async function issueEmployeeAccess(employeeId: string) {
  return apiFetch<{ employee: EmployeeRecord; credentials: EmployeeAccessCredentials }>(
    `/employees/${employeeId}/access`,
    {
      method: 'POST',
    },
  )
}

export async function rotateEmployeePassword(employeeId: string) {
  return apiFetch<{ employee: EmployeeRecord; credentials: EmployeeAccessCredentials }>(
    `/employees/${employeeId}/access/password`,
    {
      method: 'PATCH',
    },
  )
}

export async function revokeEmployeeAccess(employeeId: string) {
  return apiFetch<{ employee: EmployeeRecord }>(`/employees/${employeeId}/access`, {
    method: 'DELETE',
  })
}
