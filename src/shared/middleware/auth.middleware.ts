import { type Request, type Response, type NextFunction } from 'express'
import { verifyToken } from '../lib/jwt'

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token não fornecido' })
    return
  }

  try {
    const token = header.slice(7)
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado' })
  }
}
