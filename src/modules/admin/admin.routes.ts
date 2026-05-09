import { Router } from 'express'
import { adminController } from './admin.controller'

const router = Router()
router.get('/stats',            adminController.getStats)
router.get('/companies',        adminController.listCompanies)
router.get('/companies/:id',    adminController.getCompany)
router.patch('/companies/:id/status', adminController.updateStatus)
export default router
