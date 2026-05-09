import { prisma } from '../../shared/lib/prisma'

export interface CreateServiceInput {
  staffId?: string
  name: string
  description?: string
  durationMinutes: number
  price?: number
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  isActive?: boolean
}

export const servicesService = {
  async list(companyId: string) {
    return prisma.service.findMany({
      where: { companyId },
      include: { staff: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    })
  },

  async getById(id: string) {
    return prisma.service.findUniqueOrThrow({
      where: { id },
      include: { staff: { select: { id: true, name: true } } },
    })
  },

  async create(companyId: string, input: CreateServiceInput) {
    return prisma.service.create({ data: { ...input, companyId } })
  },

  async update(id: string, input: UpdateServiceInput) {
    return prisma.service.update({ where: { id }, data: input })
  },

  async remove(id: string) {
    return prisma.service.update({ where: { id }, data: { isActive: false } })
  },
}
