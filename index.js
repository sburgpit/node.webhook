const http = require('http')
const crypto = require('crypto')
const child_process = require('child_process')
const { secret, projectDir } = require('./config.js')

http
  .createServer(function (req, res) {
    req.on('data', function (chunk) {
      let sig = 'sha1=' + crypto.createHmac('sha1', secret).update(chunk.toString()).digest('hex')

      if (req.headers['x-hub-signature'] == sig) {
        child_process.exec(`cd ${projectDir} && git pull`)
      }
    })

    res.end()
  })
  .listen(8080)
