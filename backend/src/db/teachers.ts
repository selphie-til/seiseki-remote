import { db } from './index.js';
import { teachers, users } from './schema.js';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';

interface TeacherData {
    username: string;  // ID
    password: string;  // PW
    name: string;      // 氏名
}

export async function registerTeachersBulk(teacherList: TeacherData[]) {
    const results = [];

    for (const teacherData of teacherList) {
        try {
            // 教員マスタに登録
            const [teacher] = await db.insert(teachers).values({
                name: teacherData.name,
                email: null,
            }).returning();

            // ユーザー重複チェック
            const existing = await db.select().from(users).where(eq(users.username, teacherData.username));
            if (existing.length > 0) {
                results.push({ username: teacherData.username, success: false, message: 'ユーザー名が既に使用されています' });
                continue;
            }

            // ユーザー登録
            const hashedPassword = await hash(teacherData.password, 10);
            await db.insert(users).values({
                username: teacherData.username,
                name: teacherData.name,
                password: hashedPassword,
                role: 'general',
                teacherId: teacher.id,
            });

            results.push({ username: teacherData.username, success: true, message: '登録成功' });
        } catch (error) {
            console.error(`Teacher registration error for ${teacherData.username}:`, error);
            results.push({ username: teacherData.username, success: false, message: '登録エラー' });
        }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
        success: true,
        message: `教員 ${successCount}件登録成功、${failCount}件失敗`,
        results
    };
}