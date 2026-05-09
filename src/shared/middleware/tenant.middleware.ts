import { type Request, type Response, type NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export const tenantMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const companyId = req.user?.companyId
  if (companyId) {
    await prisma.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`
  }
  next()
}
