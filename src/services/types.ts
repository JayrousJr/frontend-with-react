/** Shared GraphQL shapes. */
export type Page<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type PageInput = { page?: number; limit?: number }

export const PAGE_FIELDS = /* GraphQL */ `
  total
  page
  limit
  totalPages
  hasNextPage
  hasPrevPage
`

export type EmployeeRef = {
  uniqueId: string
  employeeNumber: string
  fullName: string
  companyEmail: string
}

export type DepartmentRef = { uniqueId: string; code: string; name: string }

export const EMPLOYEE_REF = /* GraphQL */ `
  uniqueId
  employeeNumber
  fullName
  companyEmail
`
