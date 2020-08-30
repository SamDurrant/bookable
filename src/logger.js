const winston = require('winston')
const { NODE_ENV } = require('./config')

// set up winston
// set severity level to info and log stored in info.log file
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'info.log' })],
})

if (NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  )
}

if (process.env.NODE_ENV === 'test') {
  logger.add(
    new winston.transports.Console({
      level: 'error',
      silent: true,
    })
  )
}

module.exports = logger
