const { exec } = require('child_process')

const runCommand = (command, dir) =>
  new Promise((resolve, reject) => {
    exec(command, { cwd: dir }, (error, stdout, stderr) => {
      if (error) return reject(error)
      if (stderr && !stdout) return reject(stderr)
      resolve(stdout || stderr)
    })
  })

module.exports = runCommand
