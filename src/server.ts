import { app } from './app'
import { env } from './env/'

app.get('/', (req, res) => {
  return res.send('Hello World')
})

app.listen({
  host: '0.0.0.0',
  port: env.PORT
}).then(() => {
  console.log('Server running on http://localhost:' + env.PORT)
})
