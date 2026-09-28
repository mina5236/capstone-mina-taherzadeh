const express = require('express')
const signupRoutes = require('./routes/signupRoutes')
const loginRoutes = require('./routes/loginRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')
const profileRoutes = require('./routes/profileRoutes')

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})

// Mirrors frontend/src/App.jsx - wires each page's routes together.
app.use('/api', signupRoutes)
app.use('/api', loginRoutes)
app.use('/api', dashboardRoutes)
app.use('/api', profileRoutes)

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
