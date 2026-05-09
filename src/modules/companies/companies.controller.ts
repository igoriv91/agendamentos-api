import { type Request, type Response } from 'express'
import { companiesService } from './companies.service'

export const companiesController = {
  async getMe(req: Request, res: Response) {
    try {
      const company = await companiesService.getMe(req.user!.companyId!)
      res.json(company)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar empresa'
      res.status(404).json({ message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const company = await companiesService.update(req.user!.companyId!, req.body)
      res.json(company)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar empresa'
      res.status(400).json({ message })
    }
  },

  async regenerateToken(req: Request, res: Response) {
    try {
      const company = await companiesService.regenerateToken(req.user!.companyId!)
      res.json({ bookingLinkToken: company.bookingLinkToken })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao regenerar token'
      res.status(400).json({ message })
    }
  },
}
