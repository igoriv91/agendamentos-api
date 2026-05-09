import { prisma } from '../../shared/lib/prisma'

export interface CreateStaffInput {
  name: string
  email?: string
  phone?: string
}

export interface UpdateStaffInput extends Partial<CreateStaffInput> {
  isActive?: boolean
}

export const staffService = {
  async list(companyId: string) {
    return prisma.staff.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    })
  },

  async getById(id: string) {
    return prisma.staff.findUniqueOrThrow({ where: { id } })
  },

  async create(companyId: string, input: CreateStaffInput) {
    const subscription = await prisma.subscription.findFirstOrThrow({ where: { companyId } })
    const count = await prisma.staff.count({ where: { companyId, isActive: true } })
    const maxStaff = subscription.planSlots * 5

    if (count >= maxStaff) {
      throw new Error(
        `Limite de ${maxStaff} atendentes atingido. Faça upgrade do plano para adicionar mais.`,
      )
    }

    return prisma.staff.create({ data: { ...input, companyId } })
  },

  async update(id: string, input: UpdateStaffInput) {
    return prisma.staff.update({ where: { id }, data: input })
  },

  async remove(id: string) {
    return prisma.staff.update({ where: { id }, data: { isActive: false } })
  },
}
