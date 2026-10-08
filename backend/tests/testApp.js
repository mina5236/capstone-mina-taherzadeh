const express = require('express')
const signupRoutes = require('../routes/signupRoutes')
const loginRoutes = require('../routes/loginRoutes')
const passwordResetRoutes = require('../routes/passwordResetRoutes')

const app = express()

app.use(express.json())
app.use(signupRoutes)
app.use(loginRoutes)
app.use(passwordResetRoutes)

module.exports = app