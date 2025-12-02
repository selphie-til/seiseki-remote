// backend/src/auth.ts
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { compare, hash } from "bcryptjs";

// 新規登録関数を追加
export async function registerUser(username: string, password: string, name: string): Promise<{ success: boolean; message: string }> {
    try {
        // ユーザー名の重複チェック
        const existingUser = await db.select().from(users).where(eq(users.username, username));
        if (existingUser.length > 0) {
            return { success: false, message: 'このユーザー名は既に使用されています' };
        }

        // パスワードのハッシュ化
        const hashedPassword = await hash(password, 10);

        // ユーザーの作成
        await db.insert(users).values({
            username,
            name,
            password: hashedPassword,
            role: 'general',
        });

        return { success: true, message: 'ユーザー登録が完了しました' };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, message: '登録中にエラーが発生しました' };
    }
}

// 認証関数
export async function authenticateUser(username: string, password: string): Promise<{ success: boolean; message: string; user?: { id: number; username: string; role: string } }> {
    try {
        // ユーザーを検索
        const userResults = await db.select().from(users).where(eq(users.username, username))

        if (userResults.length === 0) {
            return { success: false, message: 'ユーザー名またはパスワードが正しくありません' }
        }

        const user = userResults[0]

        // パスワードを検証
        const isValidPassword = await compare(password, user.password);

        if (!isValidPassword) {
            return { success: false, message: 'ユーザー名またはパスワードが正しくありません' }
        }

        return { 
            success: true, 
            message: 'ログインに成功しました',
            user: { id: user.id, username: user.username, role: user.role }
        }
    } catch (error) {
        console.error('Authentication error:', error)
        return { success: false, message: '認証中にエラーが発生しました' }
    }
}

// 一括ユーザー登録関数を追加
export async function registerUsersBulk(
    userList: Array<{ username: string; password: string; name: string }>
): Promise<{ success: boolean; message: string; results?: Array<{ username: string; success: boolean; message: string }> }> {
    try {
        const results = [];
        
        for (const userData of userList) {
            try {
                // ユーザー名の重複チェック
                const existingUser = await db.select().from(users).where(eq(users.username, userData.username));
                if (existingUser.length > 0) {
                    results.push({ username: userData.username, success: false, message: 'ユーザー名が既に使用されています' });
                    continue;
                }

                // パスワードのハッシュ化
                const hashedPassword = await hash(userData.password, 10);

                // ユーザーの作成
                await db.insert(users).values({
                    username: userData.username,
                    name: userData.name,
                    password: hashedPassword,
                    role: 'general',
                });

                results.push({ username: userData.username, success: true, message: '登録成功' });
            } catch (error) {
                console.error(`Error registering user ${userData.username}:`, error);
                results.push({ username: userData.username, success: false, message: '登録エラー' });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return {
            success: true,
            message: `${successCount}件成功、${failCount}件失敗`,
            results
        };
    } catch (error) {
        console.error('Bulk registration error:', error);
        return { success: false, message: '一括登録中にエラーが発生しました' };
    }
}