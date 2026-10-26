process.env.DB_PATH = process.env.DB_PATH || ':memory:'

const express = require('express')
const signupRoutes = require('../routes/signupRoutes')
const loginRoutes = require('../routes/loginRoutes')
const passwordResetRoutes = require('../routes/passwordResetRoutes')
const profileRoutes = require('../routes/profileRoutes')
const eventsRoutes = require('../routes/eventsRoutes')
const clubRequestsRoutes = require('../routes/clubRequestsRoutes')
const app = express()

app.use(express.json())
app.use(signupRoutes)
app.use(loginRoutes)
app.use(passwordResetRoutes)
app.use(profileRoutes)
app.use(eventsRoutes)
app.use(clubRequestsRoutes)

module.exports = app