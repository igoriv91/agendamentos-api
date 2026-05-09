import { Router } from 'express'
import { companiesController } from './companies.controller'

const router = Router()

router.get('/me', companiesController.getMe)
router.put('/me', companiesController.update)
router.post('/me/regenerate-token', companiesController.regenerateToken)

export default router
