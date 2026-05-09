import { prisma } from '../../shared/lib/prisma'

export const clientsService = {
  async list(companyId: string, search?: string) {
    return prisma.client.findMany({
      where: {
        companyId,
        isTemporary: false,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        } : {}),
      },
      orderBy: { name: 'asc' },
      take: 50,
    })
  },

  async create(companyId: string, data: { name: string; email?: string; phone?: string }) {
    return prisma.client.create({ data: { ...data, companyId, isTemporary: false } })
  },

  async findOrCreate(companyId: string, name: string, phone?: string) {
    if (phone) {
      const existing = await prisma.client.findFirst({
        where: { companyId, phone, isTemporary: false },
      })
      if (existing) return existing
    }
    return prisma.client.create({ data: { companyId, name, phone, isTemporary: false } })
  },
}
