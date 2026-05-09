import bcrypt from 'bcrypt'
import { type Prisma } from '../../generated/prisma/client'
import { prisma } from '../../shared/lib/prisma'
import { signToken } from '../../shared/lib/jwt'

export interface RegisterInput {
  companyName: string
  slug: string
  companyEmail: string
  userName: string
  userEmail: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

const SALT_ROUNDS = 12

export const authService = {
  async register(input: RegisterInput) {
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const company = await tx.company.create({
        data: {
          name: input.companyName,
          slug: input.slug,
          email: input.companyEmail,
        },
      })

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name: input.userName,
          email: input.userEmail,
          passwordHash,
          role: 'company_admin',
        },
      })

      // Subscription starts with 30-day trial (due_date = today + 30)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      await tx.subscription.create({
        data: {
          companyId: company.id,
          planSlots: 1,
          dueDate,
          status: 'active',
        },
      })

      return { company, user }
    })

    const token = signToken({
      userId: result.user.id,
      companyId: result.company.id,
      role: 'company_admin',
    })

    return { token, user: result.user, company: result.company }
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { company: true },
    })

    if (!user) throw new Error('Credenciais inválidas')

    const valid = await bcrypt.compare(input.password, user.passwordHash)
    if (!valid) throw new Error('Credenciais inválidas')

    if (user.company?.status === 'blocked') {
      throw new Error('Acesso bloqueado. Regularize seu pagamento.')
    }

    const token = signToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    })

    return { token, user, company: user.company }
  },
}
