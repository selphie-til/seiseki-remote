// backend/src/index.ts
import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt' // JWT用の関数をインポート
import { registerUser, authenticateUser } from './auth.js'

const app = new Hono()
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key' // 本番環境では必ず環境変数を使用してください

// CORSを有効化
app.use('/*', cors())

// ユーザー登録API (管理者のみ実行可能)
app.post('/api/register', async (c) => {
    // 1. トークンの検証
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, message: '認証が必要です' }, 401)
    }
    
    const token = authHeader.split(' ')[1]
    
    try {
        const payload = await verify(token, JWT_SECRET)
        // 2. 管理者権限のチェック
        if (payload.role !== 'admin') {
            return c.json({ success: false, message: '管理者権限が必要です' }, 403)
        }
    } catch (e) {
        return c.json({ success: false, message: '無効なトークンです' }, 401)
    }

    const body = await c.req.json()
    // email を削除し username を受け取る
    const { username, password, name } = body

    if (!username || !password || !name) {
        return c.json({ success: false, message: 'ユーザー名、パスワード、名前は必須です' }, 400)
    }

    const result = await registerUser(username, password, name)
    return c.json(result, result.success ? 201 : 400)
})

// ログインAPI
app.post('/api/login', async (c) => {
    const body = await c.req.json()
    // email を削除し username を受け取る
    const { username, password } = body

    if (!username || !password) {
        return c.json({ success: false, message: 'ユーザー名とパスワードは必須です' }, 400)
    }

    const result = await authenticateUser(username, password)
    
    if (result.success && result.user) {
        // JWTトークンの発行
        const token = await sign({
            id: result.user.id,
            username: result.user.username,
            role: result.user.role,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24時間有効
        }, JWT_SECRET)

        return c.json({ ...result, token }, 200)
    }
    
    return c.json(result, 401)
})

const PORT = Number(process.env.PORT) || 3000

console.log(`Server is running on port ${PORT}`)

serve({
    fetch: app.fetch,
    port: PORT,
})