import { type Request, type Response, type NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export const subscriptionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const companyId = req.user?.companyId
  // superadmin has no company
  if (!companyId) { next(); return }

  const subscription = await prisma.subscription.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })

  if (subscription?.status === 'blocked') {
    res.status(402).json({
      message: 'Acesso bloqueado por inadimplência. Regularize seu pagamento.',
    })
    return
  }

  next()
}
