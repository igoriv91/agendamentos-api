import { Router } from 'express'
import { staffController } from './staff.controller'

const router = Router()

router.get('/',     staffController.list)
router.post('/',    staffController.create)
router.get('/:id',  staffController.getById)
router.put('/:id',  staffController.update)
router.delete('/:id', staffController.remove)

export default router
