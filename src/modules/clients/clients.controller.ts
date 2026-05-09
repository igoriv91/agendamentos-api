import { type Request, type Response } from 'express'
import { clientsService } from './clients.service'

export const clientsController = {
  async list(req: Request, res: Response) {
    const clients = await clientsService.list(
      req.user!.companyId!,
      req.query['search'] as string | undefined,
    )
    res.json(clients)
  },

  async create(req: Request, res: Response) {
    try {
      const client = await clientsService.create(req.user!.companyId!, req.body)
      res.status(201).json(client)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar cliente'
      res.status(400).json({ message })
    }
  },
}
