require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const bookmarksRouter = require('./bookmarks/bookmarks-router')
const logger = require('./logger')

const app = express()

const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common'

app.use(morgan(morganOption))
app.use(express.json())
app.use(helmet())
app.use(cors())
app.use(validateBearerToken)
app.use('/api/bookmarks', bookmarksRouter)
app.use(errorHandler)

// checks that bearer token matches api token
function validateBearerToken(req, res, next) {
  const apiToken = process.env.API_TOKEN
  const authToken = req.get('Authorization')
  if (!authToken || authToken.split(' ')[1] !== apiToken) {
    // adds a log statement when failure happens
    logger.error(`Unauthorized request to path: ${req.path}`)
    return res.status(401).json({ error: 'unauthorized request' })
  }
  next()
}

// hides error messages from users/malicious parties in prod
function errorHandler(error, req, res, next) {
  let response

  if (process.env.NODE_ENV === 'production') {
    response = { error: { message: 'server error' } }
  } else {
    console.error(error)
    response = { message: error.message, error }
  }
  res.status(500).json(response)
}

module.exports = app
