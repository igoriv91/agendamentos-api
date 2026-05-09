import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import authRoutes           from './modules/auth/auth.routes'
import bookingRoutes        from './modules/booking/booking.routes'
import appointmentsRoutes   from './modules/appointments/appointments.routes'
import clientsRoutes        from './modules/clients/clients.routes'
import companiesRoutes      from './modules/companies/companies.routes'
import staffRoutes          from './modules/staff/staff.routes'
import servicesRoutes       from './modules/services/services.routes'
import businessHoursRoutes  from './modules/business-hours/business-hours.routes'
import notificationsRoutes   from './modules/notifications/notifications.routes'
import subscriptionsRoutes  from './modules/subscriptions/subscriptions.routes'
import webhooksRoutes        from './modules/webhooks/webhooks.routes'
import { authMiddleware }         from './shared/middleware/auth.middleware'
import { tenantMiddleware }       from './shared/middleware/tenant.middleware'
import { subscriptionMiddleware } from './shared/middleware/subscription.middleware'
import { initSocket }             from './shared/events/socket.instance'
import { startPaymentReminderJob } from './shared/jobs/paymentReminder.job'
import { startGracePeriodJob }     from './shared/jobs/gracePeriod.job'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' },
})
initSocket(io)

app.use(express.json())

// Public routes
app.get('/health', (_req, res) => { res.json({ status: 'ok' }) })
app.use('/auth',           authRoutes)
app.use('/book/:token',    bookingRoutes)
app.use('/webhooks',       webhooksRoutes)

// Protected middleware chain applied globally after this point
app.use(authMiddleware, tenantMiddleware, subscriptionMiddleware)

// Protected routes
app.use('/companies',     companiesRoutes)
app.use('/staff',         staffRoutes)
app.use('/services',      servicesRoutes)
app.use('/business-hours', businessHoursRoutes)
app.use('/appointments',    appointmentsRoutes)
app.use('/clients',         clientsRoutes)
app.use('/notifications',   notificationsRoutes)
app.use('/subscriptions',   subscriptionsRoutes)

io.on('connection', (socket) => {
  socket.on('join', (room: string) => {
    socket.join(room)
  })
})

const PORT = process.env.PORT ?? 3000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  startPaymentReminderJob()
  startGracePeriodJob()
})
