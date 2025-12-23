import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'
import { registerUser, authenticateUser, registerUsersBulk } from './auth.js'
import { registerTeachersBulk } from './db/teachers.js'
import { registerStudentsBulk } from './db/students.js'
import { registerSubjectsBulk } from './db/subjects.js'
import { db } from './db/index.js'
import { groups } from './db/schema.js'
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
    
    // ヘッダー行を探す（「通し番号」「組」などが含まれる行）
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(5, data.length); i++) {
        const row = data[i]
        if (row[0]?.toString().includes('通し番号') || row[1]?.toString().includes('組')) {
            headerRowIndex = i
            break
        }
    }
    
    if (data.length > headerRowIndex + 1) {
        const subjects: any[] = []
        
        // 1行目の年度を取得（例: 2025）
        const yearFromHeader = data[0]?.[0] ? parseInt(data[0][0].toString()) : new Date().getFullYear()
        
        // 前回の値を保持する変数
        let prevGroupName = ''
        let prevPersonCount = ''
        let prevExam = ''
        
        // データ行を処理
        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i]
            
            // 完全な空行はスキップ
            if (!row || row.length === 0) continue
            
            // B列: 組（空白なら前回の値を使用）
            let groupName = row[1]?.toString().trim()
            if (!groupName && prevGroupName) {
                groupName = prevGroupName
            } else if (groupName) {
                prevGroupName = groupName
            }
            
            // C列: 人数（空白なら前回の値を使用）
            let personCount = row[2]?.toString().trim()
            if (!personCount && prevPersonCount) {
                personCount = prevPersonCount
            } else if (personCount) {
                prevPersonCount = personCount
            }
            
            // D列: 試験（空白なら前回の値を使用）
            let exam = row[3]?.toString().trim()
            if (!exam && prevExam) {
                exam = prevExam
            } else if (exam) {
                prevExam = exam
            }
            
            const subjectName = row[4]?.toString().trim() // E列: 科目名
            const categoryText = row[5]?.toString().trim() // F列: 専/他
            const classTypeText = row[6]?.toString().trim() // G列: 講/演
            const credits = row[7] ? parseInt(row[7].toString().trim()) : 0 // H列: 単位数
            const registrarName = row[8]?.toString().trim() // I列: 担当（登録担当教員）
            const accessPin = row[10]?.toString().trim() // K列: 暗証番号
            
            // 必須項目チェック（科目名がない行はスキップ）
            if (!subjectName) continue
            if (!groupName || !categoryText || !classTypeText || !credits || !registrarName || !accessPin) {
                continue
            }
            
            // 分野の変換（専→S, 他→O）
            let category: 'S' | 'O'
            if (categoryText.includes('専')) {
                category = 'S'
            } else if (categoryText.includes('他')) {
                category = 'O'
            } else {
                continue // 不明な分野はスキップ
            }
            
            // 形式の変換（講→Lecture, 演→Exercise）
            let classType: 'Lecture' | 'Exercise'
            if (classTypeText.includes('講')) {
                classType = 'Lecture'
            } else if (classTypeText.includes('演')) {
                classType = 'Exercise'
            } else {
                continue // 不明な形式はスキップ
            }
            
            subjects.push({
                year: yearFromHeader,
                name: subjectName,
                category,
                classType,
                credits,
                groupYear: yearFromHeader,
                groupName,
                registrarName,
                accessPin,
            })
        }

        if (subjects.length > 0) {
            // グループの自動作成
            const uniqueGroups = new Set(subjects.map(s => `${s.groupYear}-${s.groupName}`))
            for (const groupKey of uniqueGroups) {
                const [yearStr, name] = groupKey.split('-')
                const year = parseInt(yearStr)
                
                try {
                    await db.insert(groups).values({ year, name }).onConflictDoNothing()
                } catch (error) {
                    console.error(`Group creation error for ${groupKey}:`, error)
                }
            }
            
            const result = await registerSubjectsBulk(subjects)
            results.subjects.success = result.results?.filter(r => r.success).length || 0
            results.subjects.failed = result.results?.filter(r => !r.success).length || 0
            results.subjects.details = result.results || []
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

const PORT = Number(process.env.PORT) || 3000

console.log(`Server is running on port ${PORT}`)

serve({
    fetch: app.fetch,
    port: PORT,
})