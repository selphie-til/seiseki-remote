import { db } from './index.js';
import { subjects, groups, teachers } from './schema.js';
import { eq, and } from 'drizzle-orm';

interface SubjectData {
    year: number;
    name: string;
    category: 'S' | 'O';
    classType: 'Lecture' | 'Exercise';
    credits: number;
    groupYear: number;
    groupName: string;
    registrarName: string;
    accessPin: string;
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
            // グループIDを取得
            console.log(`   Looking for group: year=${subjectData.groupYear}, name=${subjectData.groupName}`)
            const [group] = await db.select()
                .from(groups)
                .where(and(
                    eq(groups.year, subjectData.groupYear),
                    eq(groups.name, subjectData.groupName)
                ));

            if (!group) {
                console.log(`   ❌ Group not found`)
                results.push({ 
                    name: subjectData.name, 
                    success: false, 
                    message: `クラス ${subjectData.groupYear}-${subjectData.groupName} が見つかりません` 
                });
                continue;
            }
            console.log(`   ✅ Group found: id=${group.id}`)

            // 重複チェック
            const subjectKey = `${subjectData.year}-${subjectData.name}-${group.id}`;
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
                year: subjectData.year,
                name: subjectData.name,
                category: subjectData.category,
                classType: subjectData.classType,
                credits: subjectData.credits,
                groupId: group.id,
                registrarId: registrarId, // nullの場合もある
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