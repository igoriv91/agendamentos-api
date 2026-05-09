import { Router } from 'express'
import { bookingController } from './booking.controller'

const router = Router({ mergeParams: true })

router.get('/',                               bookingController.getCompany)
router.get('/staff',                          bookingController.listStaff)
router.get('/staff/:staffId/services',        bookingController.listServices)
router.get('/staff/:staffId/availability',    bookingController.getAvailability)
router.get('/appointments',                   bookingController.getClientAppointments)
router.post('/appointments',                  bookingController.createAppointment)
router.delete('/appointments/:appointmentId', bookingController.cancelAppointment)

export default router
