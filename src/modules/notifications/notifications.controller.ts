import { type Request, type Response } from 'express'
import { notificationsService } from './notifications.service'

export const notificationsController = {
  async list(req: Request, res: Response) {
    res.json(await notificationsService.list(req.user!.companyId!))
  },

  async markAllRead(req: Request, res: Response) {
    await notificationsService.markAllRead(req.user!.companyId!)
    res.json({ message: 'Notificações marcadas como lidas' })
  },

  async markOneRead(req: Request, res: Response) {
    await notificationsService.markOneRead(req.params['id'] as string)
    res.json({ message: 'Notificação marcada como lida' })
  },
}
