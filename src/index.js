const config = require('./config')
const http = require('http')
const hook = require('./hook')
const telegram = require('./telegram')

const server = http.createServer((req, res) => {
  req.on('data', hook(req))
  res.end()
})

server.listen(config.port, async () => {
  console.log(`Server started on port ${config.port}`)
  telegram.sendMessage('✅ Webhook server connected')
})
