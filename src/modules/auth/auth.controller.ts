import { type Request, type Response } from 'express'
import { authService } from './auth.service'

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body)
      res.status(201).json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao cadastrar'
      res.status(400).json({ message })
    }
  },

  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body)
      res.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao autenticar'
      res.status(401).json({ message })
    }
  },
}
