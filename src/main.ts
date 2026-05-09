import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)

export const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' },
})

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

io.on('connection', (socket) => {
  socket.on('join', (room: string) => {
    socket.join(room)
  })
})

const PORT = process.env.PORT ?? 3000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
