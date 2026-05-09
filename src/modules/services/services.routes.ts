import { Router } from 'express'
import { servicesController } from './services.controller'

const router = Router()

router.get('/',       servicesController.list)
router.post('/',      servicesController.create)
router.get('/:id',    servicesController.getById)
router.put('/:id',    servicesController.update)
router.delete('/:id', servicesController.remove)

export default router
