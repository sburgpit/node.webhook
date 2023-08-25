const telegram = require('./telegram')
const runCommand = require('./runCommand')
const repos = require('../repos.json')

const messagesChain = []
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

const hook = async (chunk) => {
  const { message_id } = await telegram.sendMessage(messages.request)
  messagesChain.push(messages.request)

  const body = JSON.parse(chunk)
  if (!body) return telegram.editMessage(`${messagesChain.join('\n')}${messages.noBody}`, message_id)

  const repo = repos.find((repo) => repo.ghRepo === body.repository.name)
  if (!repo)
    return telegram.editMessage(`${messagesChain.join('\n')}${messages.noRepo(body.repository.name)}`, message_id)

  const branchName = body.ref.split('refs/heads/')[1]
  const action = repo.actions.find((action) => action.branch === branchName)
  if (!action) return telegram.editMessage(`${messagesChain.join('\n')}${messages.noActions(branchName)}`, message_id)

  const signature = `sha1=${crypto.createHmac('sha1', repo.ghSecret).update(chunk).digest('hex')}`
  if (req.headers['x-hub-signature'] !== signature)
    return telegram.editMessage(`${messagesChain.join('\n')}${messages.signature}`, message_id)

  try {
    for (const commandObj of action.commands) {
      const command = typeof commandObj === 'string' ? commandObj : commandObj.command
      const dir = typeof commandObj === 'string' ? action.dir : path.join(action.dir, commandObj.subDir)

      try {
        await runCommand(command, dir)
        const message = messages.commandPassed(command, dir)
        await telegram.editMessage(`${messagesChain.join('\n')}${message}`, message_id)
        messagesChain.push(message)
      } catch (e) {
        const message = messages.commandFailed(command, dir)
        await telegram.editMessage(`${messagesChain.join('\n')}${message}`, message_id)
        messagesChain.push(message)

        throw e
      }
    }

    await telegram.editMessage(`${messagesChain.join('\n')}${messages.success}`, message_id)
  } catch (e) {
    await telegram.editMessage(`${messagesChain.join('\n')}${messages.error(e)}`, message_id)
  }
}

module.exports = hook
