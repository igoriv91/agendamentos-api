import 'express'

declare module 'express' {
  interface Request {
    user?: {
      userId: string
      companyId: string | null
      role: 'superadmin' | 'company_admin'
    }
  }
}
