import { Router } from 'express'
import { businessHoursController } from './business-hours.controller'

const router = Router()

router.get('/:staffId',  businessHoursController.listByStaff)
router.put('/:staffId',  businessHoursController.upsert)

export default router
