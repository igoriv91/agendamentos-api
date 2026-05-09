import { type Request, type Response } from 'express'
import { adminService } from './admin.service'

export const adminController = {
  async listCompanies(_req: Request, res: Response) {
    res.json(await adminService.listCompanies())
  },

  async getCompany(req: Request, res: Response) {
    try {
      res.json(await adminService.getCompany(req.params['id'] as string))
    } catch {
      res.status(404).json({ message: 'Empresa não encontrada' })
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const { status } = req.body as { status: 'active' | 'blocked' | 'pending' }
      const company = await adminService.updateCompanyStatus(req.params['id'] as string, status)
      res.json(company)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar status'
      res.status(400).json({ message })
    }
  },

  async getStats(_req: Request, res: Response) {
    res.json(await adminService.getStats())
  },
}
