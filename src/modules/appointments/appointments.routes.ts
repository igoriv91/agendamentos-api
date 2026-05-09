import { Router } from 'express'
import { appointmentsController } from './appointments.controller'

const router = Router()
router.get('/',              appointmentsController.list)
router.post('/',             appointmentsController.create)
router.get('/:id',           appointmentsController.getById)
router.put('/:id',           appointmentsController.update)
router.patch('/:id/status',  appointmentsController.updateStatus)
export default router
