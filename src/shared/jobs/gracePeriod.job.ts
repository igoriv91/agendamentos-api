import cron from 'node-cron'
import { addDays } from 'date-fns'
import { prisma } from '../lib/prisma'
import { createNotification } from '../events/notification.helper'

export const startGracePeriodJob = () => {
  // Runs every day at 08:00
  cron.schedule('0 8 * * *', async () => {
    try {
      const today = new Date()

      // grace_period_end is a GENERATED column = due_date + 5
      // We query subscriptions where today > due_date + 5 and not yet blocked
      const subscriptions = await prisma.subscription.findMany({
        where: {
          status: { notIn: ['blocked'] },
          dueDate: { lt: addDays(today, -5) }, // due_date + 5 < today
        },
      })

      for (const sub of subscriptions) {
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'blocked' },
          }),
          prisma.company.update({
            where: { id: sub.companyId },
            data: { status: 'blocked' },
          }),
        ])

        await createNotification(
          sub.companyId,
          'payment_blocked',
          'Acesso bloqueado por inadimplência. Regularize seu pagamento para reativar.',
        )
      }
    } catch (err) {
      console.error('[gracePeriod] erro:', err)
    }
  })
}
