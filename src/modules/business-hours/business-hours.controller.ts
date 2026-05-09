import { type Request, type Response } from 'express'
import { businessHoursService } from './business-hours.service'

export const businessHoursController = {
  async listByStaff(req: Request, res: Response) {
    const hours = await businessHoursService.listByStaff(req.params['staffId'] as string)
    res.json(hours)
  },

  async upsert(req: Request, res: Response) {
    try {
      await businessHoursService.upsertAll(
        req.user!.companyId!,
        req.params['staffId'] as string,
        req.body,
      )
      res.json({ message: 'Horários salvos com sucesso' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar horários'
      res.status(400).json({ message })
    }
  },
}
