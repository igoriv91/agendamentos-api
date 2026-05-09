import { type Request, type Response } from 'express'
import { webhooksService } from './webhooks.service'

export const webhooksController = {
  async mercadopago(req: Request, res: Response) {
    try {
      await webhooksService.process(req.body, req.headers as Record<string, string>)
      res.status(200).json({ received: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook error'
      res.status(400).json({ message })
    }
  },
}
