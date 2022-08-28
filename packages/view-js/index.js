'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/view-js.cjs.prod.js')
} else {
  module.exports = require('./dist/view-js.cjs.js')
}
