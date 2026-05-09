import crypto from 'crypto'
import { Payment } from 'mercadopago'
import { prisma } from '../../shared/lib/prisma'
import { mpClient } from '../../shared/lib/mercadopago'
import { subscriptionsService } from '../subscriptions/subscriptions.service'
import { createNotification } from '../../shared/events/notification.helper'

interface MpWebhookBody {
  type: string
  action?: string
  data?: { id: string }
}

export const webhooksService = {
  verifySignature(
    xSignature: string,
    xRequestId: string,
    dataId: string,
    ts: string,
  ): boolean {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    if (!secret) return true   // skip verification if secret not configured

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
    const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    const sigParts = Object.fromEntries(
      xSignature.split(',').map((p) => p.split('=') as [string, string]),
    )
    return hash === sigParts['v1']
  },

  async handlePayment(paymentId: string) {
    const payment = new Payment(mpClient)
    const data = await payment.get({ id: paymentId })

    const companyId: string = data.metadata?.company_id ?? data.external_reference
    if (!companyId) return

    const planSlots: number = data.metadata?.plan_slots ?? 1

    if (data.status === 'approved') {
      await subscriptionsService.applyPayment(companyId, planSlots)
      await createNotification(companyId, 'payment_due', 'Pagamento aprovado! Seu plano foi renovado por 30 dias.')
    } else if (data.status === 'cancelled' || data.status === 'rejected') {
      await subscriptionsService.markOverdue(companyId)
    }
  },

  async process(body: MpWebhookBody, headers: Record<string, string>) {
    if (body.type !== 'payment') return

    const xSignature = headers['x-signature'] ?? ''
    const xRequestId = headers['x-request-id'] ?? ''
    const dataId     = body.data?.id ?? ''
    const ts         = xSignature.split(',').find((p) => p.startsWith('ts='))?.split('=')[1] ?? ''

    if (!webhooksService.verifySignature(xSignature, xRequestId, dataId, ts)) {
      throw new Error('Assinatura de webhook inválida')
    }

    await webhooksService.handlePayment(dataId)
  },
}
