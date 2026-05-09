import { type Request, type Response, type NextFunction } from 'express'

export const superadminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ message: 'Acesso restrito a superadmins' })
    return
  }
  next()
}
