import { Router } from 'express'
import { subscriptionsController } from './subscriptions.controller'

const router = Router()
router.get('/me',       subscriptionsController.getMe)
router.post('/checkout', subscriptionsController.checkout)
export default router
