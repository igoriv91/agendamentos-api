import { getIO } from './socket.instance'

export const emitToCompany = (companyId: string, event: string, data: unknown) => {
  try {
    getIO().to(`company_${companyId}`).emit(event, data)
  } catch {
    // Socket not yet initialized (e.g. during startup jobs) — ignore
  }
}
