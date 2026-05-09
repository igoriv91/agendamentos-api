import { type Request, type Response } from 'express'
import { bookingService } from './booking.service'

const token = (req: Request) => req.params['token'] as string

export const bookingController = {
  async getCompany(req: Request, res: Response) {
    try {
      const company = await bookingService.getCompany(token(req))
      res.json({ id: company.id, name: company.name, slug: company.slug })
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Não encontrado' })
    }
  },

  async listStaff(req: Request, res: Response) {
    try {
      res.json(await bookingService.listStaff(token(req)))
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Não encontrado' })
    }
  },

  async listServices(req: Request, res: Response) {
    try {
      res.json(await bookingService.listServices(token(req), req.params['staffId'] as string))
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Não encontrado' })
    }
  },

  async getAvailability(req: Request, res: Response) {
    try {
      const { date, serviceId } = req.query as Record<string, string>
      if (!date || !serviceId) {
        res.status(400).json({ message: 'date e serviceId são obrigatórios' })
        return
      }
      const slots = await bookingService.getAvailability(
        token(req), req.params['staffId'] as string, date, serviceId,
      )
      res.json(slots)
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Erro' })
    }
  },

  async createAppointment(req: Request, res: Response) {
    try {
      const result = await bookingService.createAppointment(token(req), req.body)
      res.status(201).json(result)
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Erro ao agendar' })
    }
  },

  async getClientAppointments(req: Request, res: Response) {
    try {
      const clientId = req.query['clientId'] as string
      if (!clientId) { res.json([]); return }
      res.json(await bookingService.getClientAppointments(token(req), clientId))
    } catch {
      res.json([])
    }
  },

  async cancelAppointment(req: Request, res: Response) {
    try {
      const { clientId } = req.body as { clientId: string }
      await bookingService.cancelAppointment(token(req), req.params['appointmentId'] as string, clientId)
      res.json({ message: 'Agendamento cancelado' })
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Erro ao cancelar' })
    }
  },
}
