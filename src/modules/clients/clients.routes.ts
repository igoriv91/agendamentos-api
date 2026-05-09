import { Router } from 'express'
import { clientsController } from './clients.controller'

const router = Router()
router.get('/',  clientsController.list)
router.post('/', clientsController.create)
export default router
