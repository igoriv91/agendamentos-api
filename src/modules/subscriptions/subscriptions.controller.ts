import { type Request, type Response } from 'express'
import { subscriptionsService } from './subscriptions.service'

export const subscriptionsController = {
  async getMe(req: Request, res: Response) {
    try {
      const sub = await subscriptionsService.getMe(req.user!.companyId!)
      res.json(sub)
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Não encontrado' })
    }
  },

  async checkout(req: Request, res: Response) {
    try {
      const { planSlots = 1 } = req.body as { planSlots?: number }
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
      const result = await subscriptionsService.createCheckout(
        req.user!.companyId!, planSlots, frontendUrl,
      )
      res.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar checkout'
      res.status(400).json({ message })
    }
  },
}
