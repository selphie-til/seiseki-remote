import { db } from './index.js';
import { subjects, groups, teachers } from './schema.js';
import { eq, and } from 'drizzle-orm';

interface SubjectData {
    serialNumber?: number;        // 通し番号
    groupName: string;            // 組 (e.g., "25K")
    studentCount?: number;        // 人数
    examType?: string;            // 試験 (e.g., "定期")
    name: string;                 // 科目名
    category: 'S' | 'O';          // 分野 (専/他)
    classType: 'Lecture' | 'Exercise'; // 形式 (講/演)
    credits: number;              // 単位数
    registrarName: string;        // 担当
    instructorNames?: string[];   // 担当合員
    accessPin: string;            // 暗証番号
    year?: number;                // 学年（指定されない場合は2025から抽出）
}

export async function registerSubjectsBulk(subjectList: SubjectData[]) {
    const results = [];
    
    // 既存の科目を取得（重複チェック用）
    const existingSubjects = await db.select({
        year: subjects.year,
        name: subjects.name,
        groupId: subjects.groupId
    }).from(subjects);
    
    // 既存科目のキー（year-name-groupId）をSetに格納
    const existingKeys = new Set(
        existingSubjects.map(s => `${s.year}-${s.name}-${s.groupId}`)
    );

    for (const subjectData of subjectList) {
        console.log(`\n📚 Processing subject: ${subjectData.name}`)
        
        try {
            // 学年を決定（指定されない場合は2025）
            const year = subjectData.year || 2025

            // グループIDを取得
            console.log(`   Looking for group: year=${year}, name=${subjectData.groupName}`)
            const [group] = await db.select()
                .from(groups)
                .where(and(
                    eq(groups.year, year),
                    eq(groups.name, subjectData.groupName)
                ));

            if (!group) {
                console.log(`   ❌ Group not found`)
                results.push({ 
                    name: subjectData.name, 
                    success: false, 
                    message: `クラス ${year}-${subjectData.groupName} が見つかりません` 
                });
                continue;
            }
            console.log(`   ✅ Group found: id=${group.id}`)

            // 重複チェック
            const subjectKey = `${year}-${subjectData.name}-${group.id}`;
            if (existingKeys.has(subjectKey)) {
                console.log(`   ⚠️  Subject already exists`)
                results.push({ 
                    name: subjectData.name, 
                    success: false, 
                    message: '既に登録されています' 
                });
                continue;
            }

            // 登録担当教員IDを取得（存在しない場合はnull）
            console.log(`   Looking for teacher: name=${subjectData.registrarName}`)
            let registrarId: number | null = null;
            
            const [registrar] = await db.select()
                .from(teachers)
                .where(eq(teachers.name, subjectData.registrarName));

            if (registrar) {
                registrarId = registrar.id;
                console.log(`   ✅ Teacher found: id=${registrarId}`)
            } else {
                console.log(`   ⚠️  Teacher not found, will register without teacher`)
            }

            // 科目を登録
            console.log(`   Inserting subject...`)
            await db.insert(subjects).values({
                year: year,
                name: subjectData.name,
                category: subjectData.category,
                classType: subjectData.classType,
                credits: subjectData.credits,
                groupId: group.id,
                registrarId: registrarId,
                accessPin: subjectData.accessPin,
            });

            // 登録成功したら既存キーに追加
            existingKeys.add(subjectKey);

            console.log(`   ✅ Subject registered successfully`)
            results.push({ 
                name: subjectData.name, 
                success: true, 
                message: registrarId ? '登録成功' : '登録成功（担当教員なし）'
            });
        } catch (error) {
            console.error(`   ❌ Subject registration error:`, error);
            results.push({ 
                name: subjectData.name, 
                success: false, 
                message: `登録エラー: ${error instanceof Error ? error.message : String(error)}` 
            });
        }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n📊 Subject registration summary: ${successCount} succeeded, ${failCount} failed`)

    return {
        success: true,
        message: `科目 ${successCount}件登録成功、${failCount}件失敗`,
        results
    };
}