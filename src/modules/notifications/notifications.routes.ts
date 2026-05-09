import { Router } from 'express'
import { notificationsController } from './notifications.controller'

const router = Router()
router.get('/',              notificationsController.list)
router.patch('/read-all',    notificationsController.markAllRead)
router.patch('/:id/read',    notificationsController.markOneRead)
export default router
