import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import authRoutes from './modules/auth/auth.routes'
import { authMiddleware } from './shared/middleware/auth.middleware'
import { tenantMiddleware } from './shared/middleware/tenant.middleware'
import { subscriptionMiddleware } from './shared/middleware/subscription.middleware'

const app = express()
const httpServer = createServer(app)

export const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' },
})

app.use(express.json())

// Public routes
app.get('/health', (_req, res) => { res.json({ status: 'ok' }) })
app.use('/auth', authRoutes)

// Protected middleware chain applied globally after this point
app.use(authMiddleware, tenantMiddleware, subscriptionMiddleware)

io.on('connection', (socket) => {
  socket.on('join', (room: string) => {
    socket.join(room)
  })
})

const PORT = process.env.PORT ?? 3000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
