const { Client, logger } = require('./lib/client')
const {
  DATABASE,
  VERSION,
  loadBotInstance,
  updateBotInstance,
  insertBotLog,
} = require('./config')
const { stopInstance } = require('./lib/pm2')

const getBotInstanceId = () => {
  const arg = process.argv.find((a) => a.startsWith('--bot-instance-id='))
  if (!arg) return null
  return arg.split('=')[1]?.trim()
}

const start = async () => {
  logger.info(`levanter ${VERSION}`)

  const botInstanceId = getBotInstanceId()

  if (!botInstanceId) {
    logger.error({ msg: 'Missing --bot-instance-id argument' })
    return stopInstance()
  }

  try {
    await DATABASE.authenticate({ retry: { max: 3 } })
  } catch (error) {
    logger.error({
      msg: 'Database connection failed',
      error: error.message,
      url: process.env.DATABASE_URL,
    })
    return stopInstance()
  }

  try {
    const botInstance = await loadBotInstance(botInstanceId)

    await updateBotInstance(botInstanceId, {
      status: 'STARTING',
    })

    await insertBotLog(botInstanceId, 'info', 'Starting bot instance', {
      sessionKey: botInstance.sessionKey,
      authPath: botInstance.authPath,
      botName: botInstance.botName,
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to load bot instance',
      error: error.message,
      botInstanceId,
    })
    return stopInstance()
  }

  const bot = new Client()

  try {
    await bot.connect()
  } catch (error) {
    logger.error({ msg: 'Bot client failed to start', error: error.message })

    await updateBotInstance(botInstanceId, {
      status: 'ERROR',
    })

    await insertBotLog(botInstanceId, 'error', 'Bot client failed to start', {
      error: error.message,
    })
  }

  return bot
}

const shutdown = async (bot) => {
  try {
    if (bot) await bot.close()
    await DATABASE.close()
    process.exit(0)
  } catch (error) {
    logger.error({ msg: 'Error during shutdown', error: error.message })
    process.exit(1)
  }
}

const init = async () => {
  const bot = await start()

  process.on('SIGINT', () => shutdown(bot))
  process.on('SIGTERM', () => shutdown(bot))
}

init()
