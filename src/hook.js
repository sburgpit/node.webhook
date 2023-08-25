const crypto = require('crypto')
const path = require('path')
const telegram = require('./telegram')
const runCommand = require('./runCommand')
const repos = require('../repos.json')

const messages = {
  request: '✅ Got a request',
  noBody: '❌ No body',
  noRepo: (repo) => `❌ There is no \`${repo}\` repository in the config`,
  noActions: (branch) => `❌ There is no actions for \`${branch}\` branch`,
  signature: `❌ Invalid signature`,
  commandPassed: (command, dir) => `✅ \`${command}\` passed in \`${dir}\``,
  commandFailed: (command, dir) => `❌ \`${command}\` failed in \`${dir}\``,
  error: (error) => `❌ Error:\n\`${error}\``,
  success: `✅ Completed successfully`,
}

const hook = (req) => async (chunk) => {
  const messagesChain = []
  const { message_id } = await telegram.sendMessage(messages.request)
  messagesChain.push(messages.request)

  const editAndPushMessage = async (message) => {
    await telegram.editMessage(`${messagesChain.join('\n')}\n${message}`, message_id)
    messagesChain.push(message)
  }

  const body = JSON.parse(chunk)
  if (!body) return editAndPushMessage(messages.noBody)

  const repo = repos.find((r) => r.ghRepo === body.repository.name)
  if (!repo) return editAndPushMessage(messages.noRepo(body.repository.name))

  const branchName = body.ref.split('refs/heads/')[1]
  const action = repo.actions.find((action) => action.branch === branchName)
  if (!action) return editAndPushMessage(messages.noActions(branchName))

  const signature = `sha1=${crypto.createHmac('sha1', repo.ghSecret).update(chunk).digest('hex')}`
  if (req.headers['x-hub-signature'] !== signature) return editAndPushMessage(messages.signature)

  try {
    for (const commandObj of action.commands) {
      const { command, subDir } = typeof commandObj === 'string' ? { command: commandObj } : commandObj
      const dir = subDir ? path.join(action.dir, subDir) : action.dir

      try {
        await runCommand(command, dir)
        await editAndPushMessage(messages.commandPassed(command, dir))
      } catch (e) {
        await editAndPushMessage(messages.commandFailed(command, dir))
        throw e
      }
    }

    await editAndPushMessage(messages.success)
  } catch (e) {
    await editAndPushMessage(messages.error(e))
  }
}

module.exports = hook
