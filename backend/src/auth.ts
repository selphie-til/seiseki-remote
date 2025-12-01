// backend/src/auth.ts
import { db } from './db/index.js'
import { users, type NewUser } from './db/schema.js'
import { eq } from 'drizzle-orm'
import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

// パスワードをハッシュ化
async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex')
    const derivedKey = await scryptAsync(password, salt, 64) as Buffer
    return `${salt}:${derivedKey.toString('hex')}`
}

// パスワードを検証
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const [salt, key] = hashedPassword.split(':')
    const derivedKey = await scryptAsync(password, salt, 64) as Buffer
    const keyBuffer = Buffer.from(key, 'hex')
    return timingSafeEqual(derivedKey, keyBuffer)
}

export async function registerUser(username: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
        // ユーザーが既に存在するか確認
        const existingUser = await db.select().from(users).where(eq(users.username, username))

        if (existingUser.length > 0) {
            return { success: false, message: 'ユーザー名は既に使用されています' }
        }

        // パスワードをハッシュ化
        const hashedPassword = await hashPassword(password)

        // ユーザーを作成
        const newUser: NewUser = {
            username,
            password: hashedPassword,
        }

        await db.insert(users).values(newUser)

        return { success: true, message: 'ユーザー登録が完了しました' }
    } catch (error) {
        console.error('Registration error:', error)
        return { success: false, message: '登録中にエラーが発生しました' }
    }
}

export async function authenticateUser(username: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
        // ユーザーを検索
        const userResults = await db.select().from(users).where(eq(users.username, username))

        if (userResults.length === 0) {
            return { success: false, message: 'ユーザー名またはパスワードが正しくありません' }
        }

        const user = userResults[0]

        // パスワードを検証
        const isValidPassword = await verifyPassword(password, user.password)

        if (!isValidPassword) {
            return { success: false, message: 'ユーザー名またはパスワードが正しくありません' }
        }

        return { success: true, message: 'ログインに成功しました' }
    } catch (error) {
        console.error('Authentication error:', error)
        return { success: false, message: '認証中にエラーが発生しました' }
    }
}