import { addMinutes } from 'date-fns'
import { prisma } from '../../shared/lib/prisma'
import { createNotification } from '../../shared/events/notification.helper'

export interface BookingAppointmentInput {
  staffId: string
  serviceId: string
  scheduledAt: string  // ISO string
  clientId?: string
  clientName?: string
  clientPhone?: string
  notes?: string
}

const getCompanyByToken = (token: string) =>
  prisma.company.findUnique({ where: { bookingLinkToken: token } })

export const bookingService = {
  async getCompany(token: string) {
    const company = await getCompanyByToken(token)
    if (!company || company.status === 'blocked') throw new Error('Link de agendamento inválido')
    return company
  },

  async listStaff(token: string) {
    const company = await bookingService.getCompany(token)
    return prisma.staff.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { name: 'asc' },
    })
  },

  async listServices(token: string, staffId: string) {
    const company = await bookingService.getCompany(token)
    return prisma.service.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        OR: [{ staffId: null }, { staffId }],
      },
      orderBy: { name: 'asc' },
    })
  },

  async getAvailability(token: string, staffId: string, date: string, serviceId: string) {
    const company = await bookingService.getCompany(token)

    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } })
    const duration = service.durationMinutes

    // day_of_week: 0 = Sunday
    const targetDate = new Date(`${date}T12:00:00`)
    const dayOfWeek = targetDate.getDay()

    const hours = await prisma.businessHour.findFirst({
      where: { companyId: company.id, staffId, dayOfWeek, isOpen: true },
    })
    if (!hours) return []

    // Extract HH:MM from stored time (Prisma returns as Date with 1970-01-01 base)
    const openMinutes  = hours.openTime.getHours()  * 60 + hours.openTime.getMinutes()
    const closeMinutes = hours.closeTime.getHours() * 60 + hours.closeTime.getMinutes()

    // Generate all possible slots
    const allSlots: string[] = []
    for (let t = openMinutes; t + duration <= closeMinutes; t += duration) {
      const h = String(Math.floor(t / 60)).padStart(2, '0')
      const m = String(t % 60).padStart(2, '0')
      allSlots.push(`${h}:${m}`)
    }

    // Fetch booked appointments for that day
    const dayStart = new Date(`${date}T00:00:00`)
    const dayEnd   = new Date(`${date}T23:59:59`)
    const booked = await prisma.appointment.findMany({
      where: {
        companyId: company.id,
        staffId,
        scheduledAt: { gte: dayStart, lte: dayEnd },
        status: { not: 'cancelled' },
      },
    })

    // Enforce 30-min advance notice for client-facing booking
    const now = new Date()
    const minStart = addMinutes(now, 30)

    return allSlots.filter((slot) => {
      const [h, m] = slot.split(':').map(Number)
      const slotStart = new Date(`${date}T${slot}:00`)
      const slotEnd   = addMinutes(slotStart, duration)

      if (slotStart < minStart) return false

      return !booked.some((apt) => {
        const aptEnd = addMinutes(apt.scheduledAt, apt.durationMinutes)
        return slotStart < aptEnd && slotEnd > apt.scheduledAt
      })
    })
  },

  async createAppointment(token: string, input: BookingAppointmentInput) {
    const company = await bookingService.getCompany(token)

    const service = await prisma.service.findUniqueOrThrow({ where: { id: input.serviceId } })

    let clientId = input.clientId

    if (!clientId) {
      if (!input.clientName || !input.clientPhone) {
        throw new Error('Informe nome e telefone para continuar')
      }
      // Reuse existing temp client or create new
      const existing = await prisma.client.findFirst({
        where: { companyId: company.id, phone: input.clientPhone, isTemporary: true },
      })
      const client = existing ?? await prisma.client.create({
        data: {
          companyId: company.id,
          name: input.clientName,
          phone: input.clientPhone,
          isTemporary: true,
        },
      })
      clientId = client.id
    }

    const appointment = await prisma.appointment.create({
      data: {
        companyId:       company.id,
        staffId:         input.staffId,
        serviceId:       input.serviceId,
        clientId,
        scheduledAt:     new Date(input.scheduledAt),
        durationMinutes: service.durationMinutes,
        serviceName:     service.name,
        notes:           input.notes,
        status:          'pending',
      },
    })

    await createNotification(
      company.id,
      'new_appointment',
      `Novo agendamento (link público): ${input.clientName ?? 'Cliente'} — ${service.name}`,
      appointment.id,
    )

    return { appointmentId: appointment.id, clientId }
  },

  async getClientAppointments(token: string, clientId: string) {
    const company = await bookingService.getCompany(token)

    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId: company.id },
    })
    if (!client) return []

    return prisma.appointment.findMany({
      where: {
        companyId: company.id,
        clientId,
        scheduledAt: { gte: new Date() },
        status: { notIn: ['cancelled', 'completed'] },
      },
      include: { staff: { select: { name: true } } },
      orderBy: { scheduledAt: 'asc' },
    })
  },

  async cancelAppointment(token: string, appointmentId: string, clientId: string) {
    const company = await bookingService.getCompany(token)

    const apt = await prisma.appointment.findFirstOrThrow({
      where: { id: appointmentId, companyId: company.id, clientId },
    })

    const minCancel = addMinutes(new Date(), 30)
    if (apt.scheduledAt < minCancel) {
      throw new Error('Cancelamentos devem ser feitos com no mínimo 30 minutos de antecedência')
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'cancelled', cancelledBy: 'client' },
    })

    await createNotification(
      company.id,
      'cancelled_appointment',
      `Agendamento cancelado pelo cliente: ${apt.serviceName}`,
      appointmentId,
    )

    return updated
  },
}
