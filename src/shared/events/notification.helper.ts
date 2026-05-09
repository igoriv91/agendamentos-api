import { type NotificationType } from '../../generated/prisma/client'
import { prisma } from '../lib/prisma'
import { emitToCompany } from './socket.service'

export const createNotification = async (
  companyId: string,
  type: NotificationType,
  message: string,
  appointmentId?: string,
) => {
  const notification = await prisma.notification.create({
    data: { companyId, type, message, appointmentId },
  })

  emitToCompany(companyId, 'notification:new', {
    id:            notification.id,
    type:          notification.type,
    message:       notification.message,
    appointmentId: notification.appointmentId,
    createdAt:     notification.createdAt,
  })

  return notification
}
