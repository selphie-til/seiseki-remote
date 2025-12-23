import { db } from './index.js';
import { students, groups } from './schema.js';
import { eq, and } from 'drizzle-orm';

interface StudentData {
    studentCode: string;
    name: string;
    year?: number;
    groupName?: string;
}

export async function registerStudentsBulk(studentList: StudentData[]) {
    const results = [];
    
    // 既存の学籍番号を一括取得
    const existingStudents = await db.select({ studentCode: students.studentCode }).from(students);
    const existingCodes = new Set(existingStudents.map(s => s.studentCode));
    
    // アップロードファイル内での重複チェック用
    const processedCodes = new Set<string>();

    for (const studentData of studentList) {
        try {
            // ファイル内での重複チェック
            if (processedCodes.has(studentData.studentCode)) {
                results.push({ 
                    studentCode: studentData.studentCode, 
                    success: false, 
                    message: 'ファイル内で重複しています' 
                });
                continue;
            }
            
            // データベース内での重複チェック
            if (existingCodes.has(studentData.studentCode)) {
                results.push({ 
                    studentCode: studentData.studentCode, 
                    success: false, 
                    message: '既にデータベースに登録されています' 
                });
                continue;
            }

            // グループIDを取得
            let groupId = null;
            if (studentData.year && studentData.groupName) {
                const [group] = await db.select()
                    .from(groups)
                    .where(and(
                        eq(groups.year, studentData.year),
                        eq(groups.name, studentData.groupName)
                    ));
                groupId = group?.id || null;
            }

            await db.insert(students).values({
                studentCode: studentData.studentCode,
                name: studentData.name,
                groupId,
            });

            // 成功したら追加
            processedCodes.add(studentData.studentCode);
            existingCodes.add(studentData.studentCode);
            
            results.push({ 
                studentCode: studentData.studentCode, 
                success: true, 
                message: '登録成功' 
            });
        } catch (error) {
            console.error(`Student registration error for ${studentData.studentCode}:`, error);
            results.push({ 
                studentCode: studentData.studentCode, 
                success: false, 
                message: '登録エラー' 
            });
        }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
        success: true,
        message: `学生 ${successCount}件登録成功、${failCount}件失敗`,
        results
    };
}