import bcrypt from 'bcrypt'
import { type Prisma } from '../../generated/prisma/client'
import { prisma } from '../../shared/lib/prisma'
import { signToken } from '../../shared/lib/jwt'

export interface StaffInput    { name: string; phone?: string }
export interface ServiceInput  { name: string; durationMinutes: number; price?: number }
export interface HoursInput    { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }

export interface RegisterInput {
  companyName:   string
  slug?:         string   // auto-gerado se omitido
  companyEmail:  string
  companyPhone?: string
  userName:      string
  userEmail:     string
  password:      string
  planSlots?:    number   // default 1 (5 atendentes)
  trial?:        boolean  // default true
  staff?:        StaffInput[]
  services?:     ServiceInput[]
  businessHours?: HoursInput[]
}

export interface LoginInput { email: string; password: string }

const SALT_ROUNDS = 12

const slugify = (name: string) =>
  name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 90)

const timeToDate = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  const d = new Date(1970, 0, 1, h, m)
  return d
}

export const authService = {
  async register(input: RegisterInput) {
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)
    const planSlots = input.planSlots ?? 1
    const isTrial   = input.trial ?? true

    // Auto-gerar slug único a partir do nome da empresa
    let slug = input.slug?.trim() || slugify(input.companyName)
    const exists = await prisma.company.findUnique({ where: { slug } })
    if (exists) slug = `${slug}-${Date.now().toString(36)}`

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const company = await tx.company.create({
        data: {
          name:  input.companyName,
          slug,
          email: input.companyEmail,
          phone: input.companyPhone,
        },
      })

      const user = await tx.user.create({
        data: {
          companyId:    company.id,
          name:         input.userName,
          email:        input.userEmail,
          passwordHash,
          role:         'company_admin',
        },
      })

      // Trial 7 dias; pago inicia imediatamente com dueDate = hoje + 30
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + (isTrial ? 7 : 30))

      await tx.subscription.create({
        data: {
          companyId: company.id,
          planSlots,
          dueDate,
          status: 'active',
        },
      })

      // Criar atendentes
      const createdStaff = []
      for (const s of input.staff ?? []) {
        const staff = await tx.staff.create({
          data: { companyId: company.id, name: s.name, phone: s.phone, isActive: true },
        })
        createdStaff.push(staff)
      }

      // Criar horários para cada atendente
      for (const staff of createdStaff) {
        for (const h of input.businessHours ?? []) {
          if (!h.isOpen) continue
          await tx.businessHour.create({
            data: {
              companyId:  company.id,
              staffId:    staff.id,
              dayOfWeek:  h.dayOfWeek,
              openTime:   timeToDate(h.openTime),
              closeTime:  timeToDate(h.closeTime),
              isOpen:     true,
            },
          })
        }
      }

      // Criar serviços
      for (const svc of input.services ?? []) {
        await tx.service.create({
          data: {
            companyId:       company.id,
            name:            svc.name,
            durationMinutes: svc.durationMinutes,
            price:           svc.price ?? null,
            isActive:        true,
          },
        })
      }

      return { company, user }
    })

    const token = signToken({
      userId:    result.user.id,
      companyId: result.company.id,
      role:      'company_admin',
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
      userId:    user.id,
      companyId: user.companyId,
      role:      user.role,
    })

    return { token, user, company: user.company }
  },
}
