import cron from 'node-cron'
import { addDays } from 'date-fns'
import { prisma } from '../lib/prisma'
import { createNotification } from '../events/notification.helper'

export const startPaymentReminderJob = () => {
  // Runs every day at 08:00
  cron.schedule('0 8 * * *', async () => {
    try {
      const today = new Date()
      const fiveDaysAhead = addDays(today, 5)

      const subscriptions = await prisma.subscription.findMany({
        where: {
          status: 'active',
          dueDate: { lte: fiveDaysAhead, gte: today },
        },
      })

      for (const sub of subscriptions) {
        const daysLeft = Math.ceil(
          (sub.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        )
        await createNotification(
          sub.companyId,
          'payment_due',
          `Seu plano vence em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}. Renove para continuar usando o sistema.`,
        )
      }
    } catch (err) {
      console.error('[paymentReminder] erro:', err)
    }
  })
}
