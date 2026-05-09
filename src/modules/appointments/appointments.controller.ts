import { type Request, type Response } from 'express'
import { appointmentsService } from './appointments.service'

export const appointmentsController = {
  async list(req: Request, res: Response) {
    const { startDate, endDate, staffId } = req.query as Record<string, string>
    if (!startDate || !endDate) {
      res.status(400).json({ message: 'startDate e endDate são obrigatórios' })
      return
    }
    const appointments = await appointmentsService.list(
      req.user!.companyId!, startDate, endDate, staffId,
    )
    res.json(appointments)
  },

  async getById(req: Request, res: Response) {
    try {
      const appointment = await appointmentsService.getById(req.params['id'] as string)
      res.json(appointment)
    } catch {
      res.status(404).json({ message: 'Agendamento não encontrado' })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const appointment = await appointmentsService.create(req.user!.companyId!, req.body)
      res.status(201).json(appointment)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar agendamento'
      res.status(400).json({ message })
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const appointment = await appointmentsService.updateStatus(
        req.params['id'] as string, req.body,
      )
      res.json(appointment)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar status'
      res.status(400).json({ message })
    }
  },
}
