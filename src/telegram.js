const TelegramBot = require('node-telegram-bot-api')
const config = require('./config')

class Telegram {
  client
  constructor() {
    this.client = new TelegramBot(config.botToken)
  }

  async sendMessage(message) {
    return this.client.sendMessage(config.chatID, message, { parse_mode: 'Markdown' })
  }

  async editMessage(message, message_id) {
    return this.client.editMessageText(message, {
      parse_mode: 'Markdown',
      chat_id: config.chatID,
      message_id,
    })
  }
}

module.exports = new Telegram()
