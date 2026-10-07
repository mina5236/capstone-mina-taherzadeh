const express = require('express')
const signupRoutes = require('../routes/signupRoutes')
const loginRoutes = require('../routes/loginRoutes')

const app = express()

app.use(express.json())
app.use(signupRoutes)
app.use(loginRoutes)

module.exports = app