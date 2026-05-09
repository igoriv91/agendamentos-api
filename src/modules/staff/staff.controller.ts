import { type Request, type Response } from 'express'
import { staffService } from './staff.service'

export const staffController = {
  async list(req: Request, res: Response) {
    const staff = await staffService.list(req.user!.companyId!)
    res.json(staff)
  },

  async getById(req: Request, res: Response) {
    try {
      const staff = await staffService.getById(req.params['id'] as string)
      res.json(staff)
    } catch {
      res.status(404).json({ message: 'Atendente não encontrado' })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const staff = await staffService.create(req.user!.companyId!, req.body)
      res.status(201).json(staff)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar atendente'
      res.status(400).json({ message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const staff = await staffService.update(req.params['id'] as string, req.body)
      res.json(staff)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar atendente'
      res.status(400).json({ message })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await staffService.remove(req.params['id'] as string)
      res.status(204).send()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover atendente'
      res.status(400).json({ message })
    }
  },
}
