const path = require('path')

const e2eTests = [
  'view-js/__tests__/Transition',
  'view-js/examples/'
]

module.exports = (list) => {
  return {
    filtered: list
      .filter(t => {
        return e2eTests.some(tt => {
          return t.includes(path.normalize(tt))
        })
      })
      .map(test => ({ test }))
  }
}

module.exports.e2eTests = e2eTests
