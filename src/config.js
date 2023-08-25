require('dotenv').config()

const config = {
  port: process.env.PORT,
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatID: process.env.TELEGRAM_CHAT_ID,
}

module.exports = config
