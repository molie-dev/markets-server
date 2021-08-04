const express = require('express')
const thing = require('../api/thing')
const error = require('./middlewares/error')

module.exports = app => {
  app.use('/docs', express.static('docs'))
  app.use('/thing', thing)

  // if error is not an instanceOf APIError, convert it.
  app.use(error.converter)

  // catch 404 and forward to error handler
  app.use(error.notFound)

  // error handler, send stacktrace only during development
  app.use(error.handler)
}
