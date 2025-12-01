// backend/src/index.ts
import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { registerUser, authenticateUser } from './auth.js'

const app = new Hono()

// CORSを有効化
app.use('/*', cors())

// ユーザー登録API
app.post('/api/register', async (c) => {
    const body = await c.req.json()
    const { username, password } = body

    if (!username || !password) {
        return c.json({ success: false, message: 'ユーザー名とパスワードは必須です' }, 400)
    }

    const result = await registerUser(username, password)
    return c.json(result, result.success ? 201 : 400)
})

// ログインAPI
app.post('/api/login', async (c) => {
    const body = await c.req.json()
    const { username, password } = body

    if (!username || !password) {
        return c.json({ success: false, message: 'ユーザー名とパスワードは必須です' }, 400)
    }

    const result = await authenticateUser(username, password)
    return c.json(result, result.success ? 200 : 401)
})

const PORT = Number(process.env.PORT) || 3000

console.log(`Server is running on port ${PORT}`)

serve({
    fetch: app.fetch,
    port: PORT,
})