import { addDays } from 'date-fns'
import { prisma } from '../../shared/lib/prisma'

export const adminService = {
  async listCompanies() {
    const companies = await prisma.company.findMany({
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { staff: true, appointments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return companies.map((c) => {
      const sub = c.subscriptions[0]
      return {
        id:            c.id,
        name:          c.name,
        slug:          c.slug,
        email:         c.email,
        status:        c.status,
        createdAt:     c.createdAt,
        staffCount:    c._count.staff,
        appointmentCount: c._count.appointments,
        subscription: sub
          ? {
              id:           sub.id,
              planSlots:    sub.planSlots,
              maxStaff:     sub.planSlots * 5,
              monthlyPrice: sub.planSlots * 50,
              dueDate:      sub.dueDate,
              gracePeriodEnd: addDays(sub.dueDate, 5),
              status:       sub.status,
            }
          : null,
      }
    })
  },

  async getCompany(id: string) {
    const company = await prisma.company.findUniqueOrThrow({
      where: { id },
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        users:  { select: { id: true, name: true, email: true, role: true, createdAt: true } },
        _count: { select: { staff: true, services: true, appointments: true, clients: true } },
      },
    })

    const sub = company.subscriptions[0]
    return {
      ...company,
      subscription: sub
        ? { ...sub, maxStaff: sub.planSlots * 5, monthlyPrice: sub.planSlots * 50, gracePeriodEnd: addDays(sub.dueDate, 5) }
        : null,
    }
  },

  async updateCompanyStatus(id: string, status: 'active' | 'blocked' | 'pending') {
    return prisma.company.update({ where: { id }, data: { status } })
  },

  async getStats() {
    const [totalCompanies, activeCount, blockedCount, subscriptions] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: 'active' } }),
      prisma.company.count({ where: { status: 'blocked' } }),
      prisma.subscription.findMany({
        where: { status: 'active' },
        select: { planSlots: true },
      }),
    ])

    const monthlyRevenue = subscriptions.reduce((sum, s) => sum + s.planSlots * 50, 0)

    return { totalCompanies, activeCount, blockedCount, monthlyRevenue }
  },
}
