// @ts-check
'use strict'

function ValidationError(message, innerError = null) {
  this.name = 'ValidationError'
  this.message = message
  this.stack = new Error().stack
  this.innerError = innerError
}
ValidationError.prototype = Object.create(Error.prototype)
ValidationError.prototype.constructor = ValidationError

module.exports = ValidationError
