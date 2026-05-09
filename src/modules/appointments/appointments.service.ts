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

export const appointmentsService = {
  async list(companyId: string, startDate: string, endDate: string, staffId?: string) {
    return prisma.appointment.findMany({
      where: {
        companyId,
        scheduledAt: { gte: new Date(startDate), lte: new Date(endDate) },
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

    let clientId = input.clientId
    if (!clientId) {
      if (!input.clientName || !input.clientPhone) {
        throw new Error('Informe o cliente ou nome + telefone para criar um novo')
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
