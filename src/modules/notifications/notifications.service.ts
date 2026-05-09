import { prisma } from '../../shared/lib/prisma'

export const notificationsService = {
  async list(companyId: string) {
    return prisma.notification.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  },

  async markAllRead(companyId: string) {
    await prisma.notification.updateMany({
      where: { companyId, isRead: false },
      data: { isRead: true },
    })
  },

  async markOneRead(id: string) {
    await prisma.notification.update({ where: { id }, data: { isRead: true } })
  },
}
