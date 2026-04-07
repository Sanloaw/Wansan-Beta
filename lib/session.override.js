const fs = require('fs')
const path = require('path')
const { runtime } = require('../config')

function ensureAuthPath() {
  if (!runtime.authPath) {
    throw new Error('authPath is not set from BotInstance')
  }

  const resolved = path.resolve(runtime.authPath)

  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true })
  }

  return resolved
}

module.exports = { ensureAuthPath }
