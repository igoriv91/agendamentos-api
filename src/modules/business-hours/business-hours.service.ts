import { prisma } from '../../shared/lib/prisma'

export interface BusinessHourInput {
  dayOfWeek: number
  openTime: string  // "HH:MM"
  closeTime: string // "HH:MM"
  isOpen: boolean
}

const toDate = (time: string) => new Date(`1970-01-01T${time}:00`)

export const businessHoursService = {
  async listByStaff(staffId: string) {
    return prisma.businessHour.findMany({
      where: { staffId },
      orderBy: { dayOfWeek: 'asc' },
    })
  },

  async upsert(companyId: string, staffId: string, hours: BusinessHourInput[]) {
    return prisma.$transaction(
      hours.map((h) =>
        prisma.businessHour.upsert({
          where: {
            // Use findFirst logic via update/create pattern
            id: '',
          },
          create: {
            companyId,
            staffId,
            dayOfWeek: h.dayOfWeek,
            openTime: toDate(h.openTime),
            closeTime: toDate(h.closeTime),
            isOpen: h.isOpen,
          },
          update: {
            openTime: toDate(h.openTime),
            closeTime: toDate(h.closeTime),
            isOpen: h.isOpen,
          },
        }),
      ),
    )
  },

  async upsertAll(companyId: string, staffId: string, hours: BusinessHourInput[]) {
    // Delete existing and recreate — simpler than complex upsert
    await prisma.businessHour.deleteMany({ where: { staffId } })
    return prisma.businessHour.createMany({
      data: hours.map((h) => ({
        companyId,
        staffId,
        dayOfWeek: h.dayOfWeek,
        openTime: toDate(h.openTime),
        closeTime: toDate(h.closeTime),
        isOpen: h.isOpen,
      })),
    })
  },
}
