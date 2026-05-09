import { app } from '../src/app.js'
import { env } from '../src/env/index.js'

app.get('/', (req, res) => {
  return res.send('Hello World')
})

app.listen({
  host: '0.0.0.0',
  port: env.PORT
}).then(() => {
  console.log('Server running on http://localhost:' + env.PORT)
})
