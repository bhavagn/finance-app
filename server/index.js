require('dotenv').config()
require('express-async-errors')

const express = require('express')
const cors = require('cors')
const errorHandler = require('./middleware/errorHandler')
const requireAuth = require('./middleware/auth')

const parsePdfRoutes = require('./routes/parsePdf')
const transactionsRoutes = require('./routes/transactions')
const dashboardRoutes = require('./routes/dashboard')
const networthRoutes = require('./routes/networth')
const uploadsRoutes = require('./routes/uploads')
const insightsRoutes = require('./routes/insights')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(requireAuth)

app.use('/api/parse-pdf', parsePdfRoutes)
app.use('/api/transactions', transactionsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/networth', networthRoutes)
app.use('/api/uploads', uploadsRoutes)
app.use('/api/insights', insightsRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
