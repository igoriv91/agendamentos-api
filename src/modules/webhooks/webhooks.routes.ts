import { Router } from 'express'
import { webhooksController } from './webhooks.controller'

const router = Router()
router.post('/mercadopago', webhooksController.mercadopago)
export default router
