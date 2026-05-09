import { prisma } from '../../shared/lib/prisma'

export interface UpdateCompanyInput {
  name?: string
  phone?: string
  email?: string
}

export const companiesService = {
  async getMe(companyId: string) {
    return prisma.company.findUniqueOrThrow({ where: { id: companyId } })
  },

  async update(companyId: string, input: UpdateCompanyInput) {
    return prisma.company.update({ where: { id: companyId }, data: input })
  },

  async regenerateToken(companyId: string) {
    return prisma.company.update({
      where: { id: companyId },
      data: { bookingLinkToken: crypto.randomUUID() },
    })
  },
}
