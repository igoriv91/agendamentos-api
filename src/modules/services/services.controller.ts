import { type Request, type Response } from 'express'
import { servicesService } from './services.service'

export const servicesController = {
  async list(req: Request, res: Response) {
    const services = await servicesService.list(req.user!.companyId!)
    res.json(services)
  },

  async getById(req: Request, res: Response) {
    try {
      const service = await servicesService.getById(req.params['id'] as string)
      res.json(service)
    } catch {
      res.status(404).json({ message: 'Serviço não encontrado' })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const service = await servicesService.create(req.user!.companyId!, req.body)
      res.status(201).json(service)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar serviço'
      res.status(400).json({ message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const service = await servicesService.update(req.params['id'] as string, req.body)
      res.json(service)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar serviço'
      res.status(400).json({ message })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await servicesService.remove(req.params['id'] as string)
      res.status(204).send()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover serviço'
      res.status(400).json({ message })
    }
  },
}
