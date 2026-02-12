import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'
import { eq, and } from 'drizzle-orm'
import { registerUser, authenticateUser, registerUsersBulk } from './auth.js'
import { registerTeachersBulk } from './db/teachers.js'
import { registerStudentsBulk } from './db/students.js'
import { registerSubjectsBulk } from './db/subjects.js'
import { db } from './db/index.js'
import { groups, subjects, enrollments, students } from './db/schema.js'
import * as XLSX from 'xlsx'

const app = new Hono()
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key'

app.use('/*', cors())

// ユーザー登録API
app.post('/api/register', async (c) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, message: '認証が必要です' }, 401)
    }

    const token = authHeader.split(' ')[1]

    try {
        const payload = await verify(token, JWT_SECRET)
        if (payload.role !== 'admin') {
            return c.json({ success: false, message: '管理者権限が必要です' }, 403)
        }
    } catch (e) {
        return c.json({ success: false, message: '無効なトークンです' }, 401)
    }

    const body = await c.req.json()
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
    const { username, password } = body

    if (!username || !password) {
        return c.json({ success: false, message: 'ユーザー名とパスワードは必須です' }, 400)
    }

    const result = await authenticateUser(username, password)

    if (result.success && result.user) {
        const token = await sign({
            id: result.user.id,
            username: result.user.username,
            role: result.user.role,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24
        }, JWT_SECRET)

        return c.json({ ...result, token }, 200)
    }

    return c.json(result, 401)
})

// 暗証番号で科目と履修学生を検索するAPI
app.get('/api/subject/search/:accessPin', async (c) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, message: '認証が必要です' }, 401)
    }

    const token = authHeader.split(' ')[1]

    try {
        const payload = await verify(token, JWT_SECRET)
        if (payload.role !== 'general') {
            return c.json({ success: false, message: '一般教員権限が必要です' }, 403)
        }
    } catch (e) {
        return c.json({ success: false, message: '無効なトークンです' }, 401)
    }

    const accessPin = c.req.param('accessPin')

    try {
        // 1. 科目情報を取得
        const subjectResult = await db
            .select({
                subjectId: subjects.id,
                subjectName: subjects.name,
                year: subjects.year,
                category: subjects.category,
                classType: subjects.classType,
                credits: subjects.credits,
                groupId: subjects.groupId,
                groupYear: groups.year,
                groupName: groups.name,
            })
            .from(subjects)
            .leftJoin(groups, eq(subjects.groupId, groups.id))
            .where(eq(subjects.accessPin, accessPin))
            .limit(1)

        if (subjectResult.length === 0) {
            return c.json({ success: false, message: '暗証番号に対応する科目が見つかりません' }, 404)
        }

        const subjectData = subjectResult[0]

        // 2. その科目の対象組に属する全学生を取得（enrollmentsレコードがなくても含める）
        const allStudentsInGroup = await db
            .select({
                studentId: students.id,
                studentCode: students.studentCode,
                studentName: students.name,
                enrollmentId: enrollments.id,
                scoreFirstSemester: enrollments.scoreFirstSemester,
                scoreSecondSemester: enrollments.scoreSecondSemester,
                absenceCount: enrollments.absenceCount,
            })
            .from(students)
            .leftJoin(
                enrollments,
                (on) => eq(students.id, enrollments.studentId) && eq(enrollments.subjectId, subjectData.subjectId)
            )
            .where(eq(students.groupId, subjectData.groupId))
            .orderBy(students.studentCode)

        if (allStudentsInGroup.length === 0) {
            return c.json({ success: false, message: 'この組に属する学生が見つかりません' }, 404)
        }

        // データを整形
        const subject = {
            id: subjectData.subjectId,
            name: subjectData.subjectName,
            year: subjectData.year,
            category: subjectData.category,
            classType: subjectData.classType,
            credits: subjectData.credits,
            group: {
                id: subjectData.groupId,
                year: subjectData.groupYear,
                name: subjectData.groupName,
            }
        }

        const enrollmentList = allStudentsInGroup.map(r => ({
            enrollmentId: r.enrollmentId || null,
            studentId: r.studentId,
            studentCode: r.studentCode,
            studentName: r.studentName,
            scoreFirstSemester: r.scoreFirstSemester || null,
            scoreSecondSemester: r.scoreSecondSemester || null,
            absenceCount: r.absenceCount || 0,
        }))

        return c.json({
            success: true,
            subject,
            enrollments: enrollmentList,
        }, 200)
    } catch (error) {
        console.error('Subject search error:', error)
        return c.json({ success: false, message: 'データベースエラーが発生しました' }, 500)
    }
})

// 統合一括登録API (Excel)
app.post('/api/bulk-import/xlsx', async (c) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, message: '認証が必要です' }, 401)
    }

    const token = authHeader.split(' ')[1]

    try {
        const payload = await verify(token, JWT_SECRET)
        if (payload.role !== 'admin') {
            return c.json({ success: false, message: '管理者権限が必要です' }, 403)
        }
    } catch (e) {
        return c.json({ success: false, message: '無効なトークンです' }, 401)
    }

    try {
        const body = await c.req.parseBody()
        const file = body['file']

        if (!file || !(file instanceof File)) {
            return c.json({ success: false, message: 'ファイルが選択されていません' }, 400)
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const workbook = XLSX.read(buffer, { type: 'buffer' })

        const results: any = {
            teachers: { success: 0, failed: 0, details: [] },
            students: { success: 0, failed: 0, details: [] },
            subjects: { success: 0, failed: 0, details: [] },
        }

        // 1. 教職員の登録
        const teachersSheet = workbook.Sheets['教職員一覧'] || workbook.Sheets['教員一覧']
        if (teachersSheet) {
            const data: any[] = XLSX.utils.sheet_to_json(teachersSheet, { header: 1 })
            if (data.length > 1) {
                const teachers = data.slice(1).map((row: any[]) => ({
                    username: row[0]?.toString().trim(),
                    password: row[1]?.toString().trim(),
                    name: row[2]?.toString().trim(),
                })).filter(t => t.username && t.password && t.name)

                if (teachers.length > 0) {
                    const result = await registerTeachersBulk(teachers)
                    results.teachers.success = result.results?.filter(r => r.success).length || 0
                    results.teachers.failed = result.results?.filter(r => !r.success).length || 0
                    results.teachers.details = result.results || []
                }
            }
        }

        // 2. 学生の登録（横並び形式：3列ごと - 学籍番号, 氏名, 空白）
        const studentsSheet = workbook.Sheets['学生一覧']
        if (studentsSheet) {
            const data: any[] = XLSX.utils.sheet_to_json(studentsSheet, { header: 1 })
            if (data.length > 1) {
                const students: any[] = []
                
                // データ行を処理（横並び形式: 学籍番号, 氏名, 空白 の繰り返し）
                for (let i = 1; i < data.length; i++) {
                    const row = data[i]
                    
                    // 3列ごとに学籍番号と氏名のペアを処理
                    for (let j = 0; j < row.length; j += 3) {
                        const studentCode = row[j]?.toString().trim()
                        const name = row[j + 1]?.toString().trim()
                        // row[j + 2] は空白
                        
                        if (studentCode && name) {
                            students.push({
                                studentCode,
                                name,
                                year: undefined,
                                groupName: undefined,
                            })
                        }
                    }
                }

                if (students.length > 0) {
                    const result = await registerStudentsBulk(students)
                    results.students.success = result.results?.filter(r => r.success).length || 0
                    results.students.failed = result.results?.filter(r => !r.success).length || 0
                    results.students.details = result.results || []
                }
            }
        }

        // 3. 科目の登録（科目一覧シート処理部分）
    const subjectsSheet = workbook.Sheets['科目一覧']
    if (subjectsSheet) {
        const data: any[] = XLSX.utils.sheet_to_json(subjectsSheet, { header: 1 })
    
        // ヘッダー行を探す（通し番号、組などを含む行）
        let headerRowIndex = 0
        for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i]
            if (row[0]?.toString().includes('通し番号')) {
                headerRowIndex = i
                break
            }
        }
    
        if (data.length > headerRowIndex + 1) {
            const subjects: any[] = []
        
            // 1行目の年度を取得（例: 2025）
            const yearFromHeader = data[0]?.[0] ? parseInt(data[0][0].toString()) : new Date().getFullYear()
        
            // 前行の値を保持する変数（空欄時に引き継ぐ）
            let prevGroupName = ''
            let prevCategoryText = ''
            let prevClassTypeText = ''
            let prevCreditsStr = ''
            let prevRegistrarName = ''
            let prevAccessPin = ''
        
            // データ行を処理
            for (let i = headerRowIndex + 1; i < data.length; i++) {
                const row = data[i]
            
                // 完全な空行はスキップ
                if (!row || row.length === 0) continue
            
                // 各セルを取得（空欄なら前行の値を使用）
                const groupNameCell = row[1]?.toString().trim()           // B列: 組
                const categoryCell = row[5]?.toString().trim()            // F列: 分野
                const classTypeCell = row[6]?.toString().trim()           // G列: 形式
                const creditsCell = row[7]?.toString().trim()             // H列: 単位数
                const registrarNameCell = row[8]?.toString().trim()       // I列: 担当教員
                const accessPinCell = row[10]?.toString().trim()          // K列: 暗証番号
                
                const subjectName = row[4]?.toString().trim()             // E列: 科目名（必須）
            
                // 科目名がない場合はスキップ
                if (!subjectName) continue
            
                // 空欄セルは前行の値を引き継ぐ
                const groupName = groupNameCell || prevGroupName
                const categoryText = categoryCell || prevCategoryText
                const classTypeText = classTypeCell || prevClassTypeText
                const creditsStr = creditsCell || prevCreditsStr
                const registrarName = registrarNameCell || prevRegistrarName
                const accessPin = accessPinCell || prevAccessPin
            
                // 前行の値を更新
                if (groupNameCell) prevGroupName = groupNameCell
                if (categoryCell) prevCategoryText = categoryCell
                if (classTypeCell) prevClassTypeText = classTypeCell
                if (creditsCell) prevCreditsStr = creditsCell
                if (registrarNameCell) prevRegistrarName = registrarNameCell
                if (accessPinCell) prevAccessPin = accessPinCell
            
                // 必須項目の確認
                if (!groupName || !categoryText || !classTypeText || !creditsStr || !registrarName || !accessPin) {
                    console.log(`⚠️  Row ${i + 1}: 必須項目が不足しています（組:${groupName}, 分野:${categoryText}, 形式:${classTypeText}, 単位:${creditsStr}, 教員:${registrarName}, 暗証:${accessPin}）`)
                    continue
                }
            
                // 単位数を数値に変換
                const credits = parseInt(creditsStr)
                if (isNaN(credits)) {
                    console.log(`⚠️  Row ${i + 1}: 単位数が正の整数ではありません（${creditsStr}）`)
                    continue
                }
            
                // 分野の変換（専→S, 他→O）
                let category: 'S' | 'O'
                if (categoryText.includes('専')) {
                    category = 'S'
                } else if (categoryText.includes('他')) {
                    category = 'O'
                } else {
                    console.log(`⚠️  Row ${i + 1}: 不明な分野 "${categoryText}"`)
                    continue
                }
            
                // 形式の変換（講→Lecture, 演→Exercise）
                let classType: 'Lecture' | 'Exercise'
                if (classTypeText.includes('講')) {
                    classType = 'Lecture'
                } else if (classTypeText.includes('演')) {
                    classType = 'Exercise'
                } else {
                    console.log(`⚠️  Row ${i + 1}: 不明な形式 "${classTypeText}"`)
                    continue
                }
            
                subjects.push({
                    year: yearFromHeader,
                    name: subjectName,
                    category,
                    classType,
                    credits,
                    groupYear: yearFromHeader,
                    groupName: groupName.trim(),
                    registrarName: registrarName.trim(),
                    accessPin: accessPin.trim(),
                })
                
                console.log(`✅ Row ${i + 1}: ${subjectName} (${groupName}組, ${registrarName}, ${accessPin})`)
            }

            if (subjects.length > 0) {
                // グループの自動作成
                const uniqueGroups = new Set(subjects.map(s => `${s.groupYear}-${s.groupName}`))
                for (const groupKey of uniqueGroups) {
                    const [yearStr, name] = groupKey.split('-')
                    const year = parseInt(yearStr)
                
                    try {
                        await db.insert(groups).values({ year, name }).onConflictDoNothing()
                        console.log(`✅ Group created: ${year}年${name}組`)
                    } catch (error) {
                        console.error(`❌ Group creation error for ${groupKey}:`, error)
                    }
                }
            
                const result = await registerSubjectsBulk(subjects)
                results.subjects.success = result.results?.filter(r => r.success).length || 0
                results.subjects.failed = result.results?.filter(r => !r.success).length || 0
                results.subjects.details = result.results || []
            } else {
                console.log('⚠️  登録可能な科目がありません')
            }
        }
    }

        const totalSuccess = results.teachers.success + results.students.success + results.subjects.success
        const totalFailed = results.teachers.failed + results.students.failed + results.subjects.failed

        return c.json({
            success: true,
            message: `一括登録完了: 合計 ${totalSuccess}件成功、${totalFailed}件失敗`,
            results,
        }, 201)
    } catch (error) {
        console.error('Bulk import error:', error)
        return c.json({ success: false, message: 'ファイル処理中にエラーが発生しました' }, 500)
    }
})

    // 成績一覧取得API（学年・クラス別）
    app.get('/api/grades/list/:year/:className', async (c) => {
        const authHeader = c.req.header('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ success: false, message: '認証が必要です' }, 401)
        }

        const token = authHeader.split(' ')[1]

        try {
            await verify(token, JWT_SECRET)
        } catch (e) {
            return c.json({ success: false, message: '無効なトークンです' }, 401)
        }

        const year = parseInt(c.req.param('year'))
        const className = c.req.param('className')

        try {
            // 1. グループを検索
            const groupResult = await db
                .select()
                .from(groups)
                .where(and(eq(groups.year, year), eq(groups.name, className)))
                .limit(1)

            if (groupResult.length === 0) {
                return c.json({ 
                    success: false, 
                    message: `${year}年${className}組が見つかりません` 
                }, 404)
            }

            const groupId = groupResult[0].id

            // 2. 対象クラスの全科目を取得
            const allSubjects = await db
                .select({
                    subjectId: subjects.id,
                    subjectName: subjects.name,
                    category: subjects.category,
                    classType: subjects.classType,
                    credits: subjects.credits,
                })
                .from(subjects)
                .where(eq(subjects.groupId, groupId))
                .orderBy(subjects.id)

            // 科目がない場合は科目一覧のみ返す
            if (allSubjects.length === 0) {
                return c.json({
                    success: true,
                    year,
                    className,
                    subjects: [],
                    students: [],
                }, 200)
            }

            // 3. 全学生を取得
            const allStudents = await db
                .select({
                    studentId: students.id,
                    studentCode: students.studentCode,
                    studentName: students.name,
                })
                .from(students)
                .where(eq(students.groupId, groupId))
                .orderBy(students.studentCode)

            // 4. 対象グループの科目IDリスト
            const subjectIds = allSubjects.map(s => s.subjectId)
            const studentIds = allStudents.map(s => s.studentId)

            // 5. 成績情報を取得
            const enrollmentsMap = new Map<string, any>()

            if (studentIds.length > 0 && subjectIds.length > 0) {
                const enrollmentsData = await db
                    .select({
                        studentId: enrollments.studentId,
                        subjectId: enrollments.subjectId,
                        enrollmentId: enrollments.id,
                        scoreFirstSemester: enrollments.scoreFirstSemester,
                        scoreSecondSemester: enrollments.scoreSecondSemester,
                        absenceCount: enrollments.absenceCount,
                    })
                    .from(enrollments)

                enrollmentsData.forEach(e => {
                    enrollmentsMap.set(`${e.studentId}-${e.subjectId}`, e)
                })
            }

            // 6. 学生ごとに科目情報をマッピング
            const result = allStudents.map(student => {
                const gradesForStudent = allSubjects.map(subject => {
                    const key = `${student.studentId}-${subject.subjectId}`
                    const enrollment = enrollmentsMap.get(key)

                    return {
                        enrollmentId: enrollment?.enrollmentId || null,
                        subjectId: subject.subjectId,
                        subjectName: subject.subjectName,
                        category: subject.category,
                        classType: subject.classType,
                        credits: subject.credits,
                        scoreFirstSemester: enrollment?.scoreFirstSemester ?? null,
                        scoreSecondSemester: enrollment?.scoreSecondSemester ?? null,
                        absenceCount: enrollment?.absenceCount ?? 0,
                    }
                })

                return {
                    studentId: student.studentId,
                    studentCode: student.studentCode,
                    studentName: student.studentName,
                    grades: gradesForStudent,
                }
            })

            return c.json({
                success: true,
                year,
                className,
                subjects: allSubjects,
                students: result,
            }, 200)
        } catch (error) {
            console.error('Grades list error:', error)
            return c.json({ success: false, message: 'データベースエラーが発生しました' }, 500)
        }
    })

// 利用可能な学年・クラスの一覧を取得
app.get('/api/grades/options', async (c) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, message: '認証が必要です' }, 401)
    }

    const token = authHeader.split(' ')[1]

    try {
        await verify(token, JWT_SECRET)
    } catch (e) {
        return c.json({ success: false, message: '無効なトークンです' }, 401)
    }

    try {
        const allGroups = await db
            .select()
            .from(groups)
            .orderBy(groups.year, groups.name)

        // 学年でグループ化
        const groupedByYear = new Map<number, string[]>()
        allGroups.forEach(group => {
            if (!groupedByYear.has(group.year)) {
                groupedByYear.set(group.year, [])
            }
            groupedByYear.get(group.year)!.push(group.name)
        })

        const options = Array.from(groupedByYear.entries())
            .sort((a, b) => b[0] - a[0]) // 新しい学年から表示
            .map(([year, names]) => ({
                year,
                classes: names.sort(),
            }))

        return c.json({
            success: true,
            options,
        }, 200)
    } catch (error) {
        console.error('Grades options error:', error)
        return c.json({ success: false, message: 'データベースエラーが発生しました' }, 500)
    }
    })

    // 成績保存API
    app.post('/api/grades/save', async (c) => {
        const authHeader = c.req.header('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ success: false, message: '認証が必要です' }, 401)
        }

        const token = authHeader.split(' ')[1]

        try {
            const payload = await verify(token, JWT_SECRET)
            if (payload.role !== 'general') {
                return c.json({ success: false, message: '一般教員権限が必要です' }, 403)
            }
        } catch (e) {
            return c.json({ success: false, message: '無効なトークンです' }, 401)
        }

        try {
            const body = await c.req.json()
            const { subjectId, enrollmentData } = body

            if (!subjectId || !enrollmentData || !Array.isArray(enrollmentData)) {
                return c.json({ success: false, message: '科目IDと履修者データが必須です' }, 400)
            }

            let savedCount = 0
            let errorCount = 0
            const errors: any[] = []

            // 各履修者の成績を保存または更新
            for (const data of enrollmentData) {
                try {
                    const scoreFirst = data.scoreFirstSemester ? parseInt(data.scoreFirstSemester) : null
                    const scoreSecond = data.scoreSecondSemester ? parseInt(data.scoreSecondSemester) : null
                    const absence = parseInt(data.absenceCount || '0')

                    // enrollmentIdがあるか確認
                    if (data.enrollmentId) {
                        // 既存レコードを更新
                        await db.update(enrollments).set({
                            scoreFirstSemester: scoreFirst,
                            scoreSecondSemester: scoreSecond,
                            absenceCount: absence,
                        }).where(eq(enrollments.id, data.enrollmentId))
                    } else {
                        // 新規レコードを作成
                        await db.insert(enrollments).values({
                            studentId: data.studentId,
                            subjectId: subjectId,
                            scoreFirstSemester: scoreFirst,
                            scoreSecondSemester: scoreSecond,
                            absenceCount: absence,
                        })
                    }

                    savedCount++
                } catch (error) {
                    errorCount++
                    errors.push({
                        studentCode: data.studentCode,
                        studentName: data.studentName,
                        message: error instanceof Error ? error.message : '保存エラー'
                    })
                }
            }

            return c.json({
                success: errorCount === 0,
                message: `${savedCount}件の成績を保存しました${errorCount > 0 ? `、${errorCount}件エラー` : ''}`,
                savedCount,
                errorCount,
                errors: errors.length > 0 ? errors : undefined
            }, 200)
        } catch (error) {
            console.error('Grade save error:', error)
            return c.json({ success: false, message: 'エラーが発生しました' }, 500)
        }
    })

const PORT = Number(process.env.PORT) || 3000

console.log(`Server is running on port ${PORT}`)

serve({
    fetch: app.fetch,
    port: PORT,
})