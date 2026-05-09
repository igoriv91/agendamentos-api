import { addMinutes } from 'date-fns'
import { prisma } from '../../shared/lib/prisma'
import { createNotification } from '../../shared/events/notification.helper'
import { clientsService } from '../clients/clients.service'

export interface CreateAppointmentInput {
  staffId: string
  serviceId: string
  scheduledAt: string
  notes?: string
  // Client: either existing id or new client data
  clientId?: string
  clientName?: string
  clientPhone?: string
}

export interface UpdateStatusInput {
  status: 'confirmed' | 'completed' | 'cancelled'
  cancelledBy?: 'company' | 'client'
}

export interface UpdateAppointmentInput {
  staffId?: string
  serviceId?: string
  scheduledAt?: string
  clientName?: string
  clientPhone?: string
  notes?: string
}

export const appointmentsService = {
  async list(companyId: string, startDate: string, endDate: string, staffId?: string) {
    const start = new Date(startDate)
    const end   = new Date(endDate)
    end.setUTCHours(23, 59, 59, 999)   // covers full UTC day (date-only strings parse as UTC midnight)

    return prisma.appointment.findMany({
      where: {
        companyId,
        scheduledAt: { gte: start, lte: end },
        status: { not: 'cancelled' },
        ...(staffId ? { staffId } : {}),
      },
      include: {
        staff:  { select: { id: true, name: true } },
        client: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    })
  },

  async create(companyId: string, input: CreateAppointmentInput) {
    const service = await prisma.service.findUniqueOrThrow({ where: { id: input.serviceId } })

    const newStart = new Date(input.scheduledAt)
    const newEnd   = addMinutes(newStart, service.durationMinutes)
    const dayStart = new Date(newStart); dayStart.setHours(0, 0, 0, 0)
    const dayEnd   = new Date(newStart); dayEnd.setHours(23, 59, 59, 999)

    const sameDayApts = await prisma.appointment.findMany({
      where: { staffId: input.staffId, status: { not: 'cancelled' }, scheduledAt: { gte: dayStart, lte: dayEnd } },
    })
    const hasConflict = sameDayApts.some((apt) => {
      const aptEnd = addMinutes(apt.scheduledAt, apt.durationMinutes)
      return newStart < aptEnd && newEnd > apt.scheduledAt
    })
    if (hasConflict) throw new Error('Já existe um agendamento para este atendente neste horário')

    let clientId = input.clientId
    if (!clientId) {
      if (!input.clientName) {
        throw new Error('Informe o nome do cliente para criar um novo agendamento')
      }
      const client = await clientsService.findOrCreate(companyId, input.clientName, input.clientPhone)
      clientId = client.id
    }

    const appointment = await prisma.appointment.create({
      data: {
        companyId,
        staffId: input.staffId,
        serviceId: input.serviceId,
        clientId,
        scheduledAt: new Date(input.scheduledAt),
        durationMinutes: service.durationMinutes,
        serviceName: service.name,
        notes: input.notes,
        status: 'pending',
      },
      include: {
        staff:  { select: { id: true, name: true } },
        client: { select: { id: true, name: true, phone: true } },
      },
    })

    await createNotification(
      companyId,
      'new_appointment',
      `Novo agendamento: ${appointment.client?.name ?? 'Cliente'} — ${appointment.serviceName} às ${appointment.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      appointment.id,
    )

    return appointment
  },

  async updateStatus(id: string, input: UpdateStatusInput) {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.cancelledBy ? { cancelledBy: input.cancelledBy } : {}),
      },
      include: { client: { select: { name: true } } },
    })

    const typeMap = {
      cancelled: 'cancelled_appointment',
      confirmed: 'changed_appointment',
      completed: 'changed_appointment',
    } as const

    await createNotification(
      appointment.companyId,
      typeMap[input.status] ?? 'changed_appointment',
      `Agendamento ${input.status === 'cancelled' ? 'cancelado' : input.status === 'confirmed' ? 'confirmado' : 'realizado'}: ${appointment.client?.name ?? ''} — ${appointment.serviceName}`,
      appointment.id,
    )

    return appointment
  },

  async update(id: string, companyId: string, input: UpdateAppointmentInput) {
    const current = await prisma.appointment.findUniqueOrThrow({
      where: { id },
      include: { client: true },
    })

    let durationMinutes = current.durationMinutes
    let serviceName = current.serviceName
    if (input.serviceId && input.serviceId !== current.serviceId) {
      const svc = await prisma.service.findUniqueOrThrow({ where: { id: input.serviceId } })
      durationMinutes = svc.durationMinutes
      serviceName = svc.name
    }

    if (input.staffId || input.scheduledAt) {
      const checkStaffId    = input.staffId    ?? current.staffId
      const checkScheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : current.scheduledAt
      const checkEnd        = addMinutes(checkScheduledAt, durationMinutes)
      const dayStart = new Date(checkScheduledAt); dayStart.setHours(0, 0, 0, 0)
      const dayEnd   = new Date(checkScheduledAt); dayEnd.setHours(23, 59, 59, 999)

      const sameDayApts = await prisma.appointment.findMany({
        where: { id: { not: id }, staffId: checkStaffId, status: { not: 'cancelled' }, scheduledAt: { gte: dayStart, lte: dayEnd } },
      })
      const hasConflict = sameDayApts.some((apt) => {
        const aptEnd = addMinutes(apt.scheduledAt, apt.durationMinutes)
        return checkScheduledAt < aptEnd && checkEnd > apt.scheduledAt
      })
      if (hasConflict) throw new Error('Já existe um agendamento para este atendente neste horário')
    }

    if (current.clientId && (input.clientName || input.clientPhone !== undefined)) {
      await prisma.client.update({
        where: { id: current.clientId },
        data: {
          ...(input.clientName ? { name: input.clientName } : {}),
          ...(input.clientPhone !== undefined ? { phone: input.clientPhone || null } : {}),
        },
      })
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(input.staffId    ? { staffId: input.staffId }                                              : {}),
        ...(input.serviceId  ? { serviceId: input.serviceId, durationMinutes, serviceName }            : {}),
        ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) }                           : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null }                                 : {}),
      },
      include: {
        staff:  { select: { id: true, name: true } },
        client: { select: { id: true, name: true, phone: true } },
      },
    })

    await createNotification(
      companyId,
      'changed_appointment',
      `Agendamento alterado: ${updated.client?.name ?? ''} — ${updated.serviceName}`,
      updated.id,
    )

    return updated
  },

  async getById(id: string) {
    return prisma.appointment.findUniqueOrThrow({
      where: { id },
      include: {
        staff:   { select: { id: true, name: true } },
        client:  { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true, price: true } },
      },
    })
  },
}
