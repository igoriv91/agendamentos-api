import { addDays } from 'date-fns'
import { Preference } from 'mercadopago'
import { prisma } from '../../shared/lib/prisma'
import { mpClient } from '../../shared/lib/mercadopago'

const compute = (planSlots: number, dueDate: Date) => ({
  maxStaff:       planSlots * 5,
  monthlyPrice:   planSlots * 50,
  gracePeriodEnd: addDays(dueDate, 5),
})

export const subscriptionsService = {
  async getMe(companyId: string) {
    const sub = await prisma.subscription.findFirstOrThrow({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    })
    return { ...sub, ...compute(sub.planSlots, sub.dueDate) }
  },

  async createCheckout(companyId: string, planSlots: number, frontendUrl: string) {
    const monthlyPrice = planSlots * 50
    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } })

    const preference = new Preference(mpClient)
    const result = await preference.create({
      body: {
        items: [{
          id:          `subscription_${companyId}`,
          title:       `Plano Agendamentos — ${planSlots * 5} atendentes`,
          unit_price:  monthlyPrice,
          quantity:    1,
          currency_id: 'BRL',
        }],
        metadata:    { companyId, planSlots },
        back_urls:   {
          success: `${frontendUrl}/company?payment=success`,
          failure: `${frontendUrl}/company?payment=failure`,
          pending: `${frontendUrl}/company?payment=pending`,
        },
        auto_return: 'approved',
        external_reference: companyId,
      },
    })

    // Persist payment_id reference on the subscription
    await prisma.subscription.updateMany({
      where: { companyId },
      data:  { gatewayPaymentId: result.id },
    })

    return { checkoutUrl: result.init_point! }
  },

  async applyPayment(companyId: string, planSlots: number) {
    const newDueDate = addDays(new Date(), 30)
    await prisma.$transaction([
      prisma.subscription.updateMany({
        where: { companyId },
        data:  { status: 'active', dueDate: newDueDate, planSlots },
      }),
      prisma.company.update({
        where: { id: companyId },
        data:  { status: 'active' },
      }),
    ])
  },

  async markOverdue(companyId: string) {
    await prisma.subscription.updateMany({
      where: { companyId },
      data:  { status: 'overdue' },
    })
  },
}
