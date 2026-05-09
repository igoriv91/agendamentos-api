import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET!
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d'

export interface JwtPayload {
  userId: string
  companyId: string | null
  role: 'superadmin' | 'company_admin'
}

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions)

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, SECRET) as JwtPayload
