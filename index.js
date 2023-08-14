require('dotenv').config()
const http = require('http')
const crypto = require('crypto')
const { exec } = require('child_process')
const TG = require('node-telegram-bot-api')
const moment = require('moment')
const repos = require('./repos.json')
const tgClient = new TG(process.env.TG_BOT_TOKEN)

let body

const server = http.createServer((req, res) => {
  sendTgMsg('✅ Webhook Notifier Connected')

  req.on('data', (chunk) => {
    sendTgMsg('✅ Connection')

    body = JSON.parse(chunk)
    if (!body) return

    const repo = repos.find((repo) => repo.ghRepo === body.repository.name)
    if (!repo) return

    const action = repo.actions.find((action) => `refs/heads/${action.branch}` === body?.ref)
    if (!action) return

    const signature = `sha1=${crypto.createHmac('sha1', repo.ghSecret).update(chunk).digest('hex')}`
    if (req.headers['x-hub-signature'] !== signature) return

    run(`cd ${action.dir} && ${action.commands.join(' && ')}`)
      .then(() => sendTgResultMsg('success'))
      .catch((e) => sendTgResultMsg('error', e))
  })

  res.end()
})

const sendTgMsg = (msg) => {
  for (const chatID of process.env.TG_CHAT_IDS.split(',')) tgClient.sendMessage(chatID, msg, { parse_mode: 'Markdown' })
}

const sendTgResultMsg = (status, error) => {
  const icon = status === 'error' ? '❌' : '✅'
  const msg = `${icon} ${moment(new Date()).format('MMMM D, h:mm:ss a')}\n\n**Repository:**\n\`${
    body.repository.name
  }\`\n\n**Branch:**\n\`${body.ref}\`\n\n**Commit:**\n[${body.head_commit.url}](${
    body.head_commit.url
  })\n\n**Pusher:**\n${body.pusher.name}\n\n${status === 'error' ? `**Error:**\n\`${error}\`` : ''}`

  sendTgMsg(msg)
}

const run = (child) =>
  new Promise((resolve, reject) => {
    exec(child, (error, stdout, stderr) => {
      if (error) return reject(error)
      if (stderr) return reject(stderr)
      resolve(stdout)
    })
  })

server.listen(process.env.PORT, () => console.log(`Server started on port ${process.env.PORT}`))
