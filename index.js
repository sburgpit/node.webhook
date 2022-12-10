const http = require('http')
const crypto = require('crypto')
const { exec } = require('child_process')
const TG = require('node-telegram-bot-api')
const config = require('./config.json')
const moment = require('moment')

const tgToken = config.telegram.token
const chatList = config.telegram.chatList
const bot = new TG(tgToken)
const gitList = config.git

const run = (child) =>
  new Promise((resolve, reject) => {
    exec(child, (error, stdout, stderr) => {
      if (error) return reject(error)
      if (stderr) return reject(stderr)
      resolve(stdout)
    })
  })

const sendTgMessage = (status, error) => {
  const icon = status === 'error' ? '❌' : '✅'
  const msg = `${icon} ${moment(new Date()).format('MMMM D, h:mm:ss a')}\n\n<b>Repository:</b>\n${
    body?.repository.name
  }\n\n<b>Branch:</b>\n${body?.ref}\n\n<b>Commit:</b>\n<a href="${body?.head_commit.url}">${
    body?.head_commit.url
  }</a>\n\n<b>Pusher:</b>\n${body?.pusher.name}\n\n${status === 'error' ? `<b>Error:</b>\n${error}` : ''}`

  chatList.map((id) =>
    bot.sendMessage(id, msg, {
      parse_mode: 'HTML',
    })
  )
}

let body

const server = http.createServer((req, res) => {
  req.on('data', (chunk) => {
    body = JSON.parse(chunk)
    const repoName = body?.repository.name

    const gitRepo = gitList[repoName]
    if (!gitRepo) return

    const branchList = gitRepo.branchList
    const branch = branchList.find((branch) => `refs/heads/${branch.name}` === body?.ref)
    if (!branch) return

    const signature = `sha1=${crypto.createHmac('sha1', gitRepo.secret).update(chunk).digest('hex')}`
    const isAllowed = req.headers['x-hub-signature'] === signature
    if (!isAllowed) return

    run(`cd ${branch.dir} && ${branch.exec.join(' && ')}`)
      .then(() => sendTgMessage('success'))
      .catch((e) => sendTgMessage('error', e))
  })

  res.end()
})

server.listen(7920)
