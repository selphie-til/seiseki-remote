import { useState, useEffect } from 'react'
import './App.css'

interface BulkRegisterProps {
  token: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface BulkImportResponse {
  success: boolean;
  message: string;
  results?: {
    teachers: { success: number; failed: number; details: any[] };
    students: { success: number; failed: number; details: any[] };
    subjects: { success: number; failed: number; details: any[] };
  };
}

interface Enrollment {
  enrollmentId: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  scoreFirstSemester: number | null;
  scoreSecondSemester: number | null;
  absenceCount: number;
}

interface Subject {
  id: number;
  name: string;
  year: number;
  category: string;
  classType: string;
  credits: number;
  group: {
    id: number;
    year: number;
    name: string;
  };
}

interface SearchResult {
  success: boolean;
  subject?: Subject;
  enrollments?: Enrollment[];
  message?: string;
}

interface GradesOption {
  year: number;
  classes: string[];
}

interface StudentGrade {
  studentId: number;
  studentCode: string;
  studentName: string;
  grades: Array<{
    enrollmentId: number | null;
    subjectId: number;
    subjectName: string;
    category: string;
    classType: string;
    credits: number;
    scoreFirstSemester: number | null;
    scoreSecondSemester: number | null;
    absenceCount: number;
  }>;
}

interface GradesListResponse {
  success: boolean;
  year?: number;
  className?: string;
  students?: StudentGrade[];
  message?: string;
}

const BulkImportRegister = ({ token, onSuccess, onError }: BulkRegisterProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      onError('ファイルを選択してください')
      return
    }

    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://localhost:3000/api/bulk-import/xlsx', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      })

      const data: BulkImportResponse = await response.json()

      if (response.ok && data.success) {
        const results = data.results!
        const summary = `
【登録結果】
教員: ${results.teachers.success}件成功、${results.teachers.failed}件失敗
学生: ${results.students.success}件成功、${results.students.failed}件失敗
科目: ${results.subjects.success}件成功、${results.subjects.failed}件失敗
        `.trim()

        onSuccess(`${data.message}\n\n${summary}`)
        setFile(null)
        const fileInput = document.getElementById('bulk-import-file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        onError(data.message || '一括登録に失敗しました')
      }
    } catch (error) {
      onError(`ファイル処理中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bulk-register-section" style={{border: '1px solid #ccc', padding: '1rem', marginTop: '1rem'}}>
      <h3>データ一括登録（Excel）</h3>
      <div style={{backgroundColor: '#f5f5f5', padding: '1rem', marginBottom: '1rem', borderRadius: '4px'}}>
        <h4 style={{marginTop: 0}}>必要なExcelシート</h4>
        <p style={{margin: '0.5rem 0', fontSize: '0.9rem'}}>
          1つのExcelファイルに以下のシートを含めてください：
        </p>

        <div style={{marginTop: '1rem'}}>
          <h5 style={{margin: '0.5rem 0', color: '#1976d2'}}>1. 教職員一覧シート</h5>
          <table style={{width: '100%', backgroundColor: '#fff', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem'}}>
            <thead>
            <tr style={{backgroundColor: '#e3f2fd'}}>
              <th style={{border: '1px solid #ccc', padding: '0.5rem'}}>A列: ID</th>
              <th style={{border: '1px solid #ccc', padding: '0.5rem'}}>B列: PW</th>
              <th style={{border: '1px solid #ccc', padding: '0.5rem'}}>C列: 氏名</th>
            </tr>
            </thead>
            <tbody>
            <tr>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>teacher001</td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>pass123</td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>山田太郎</td>
            </tr>
            </tbody>
          </table>

          <h5 style={{margin: '0.5rem 0', color: '#1976d2'}}>2. 学生一覧シート</h5>
          <p style={{margin: '0.5rem 0', fontSize: '0.9rem', color: '#666'}}>
            横並び形式：学籍番号、氏名、空白の繰り返し
          </p>
          <table style={{width: '100%', backgroundColor: '#fff', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem'}}>
            <thead>
            <tr style={{backgroundColor: '#e3f2fd'}}>
              <th style={{border: '1px solid #ccc', padding: '0.5rem'}}>A列</th>
              <th style={{border: '1px solid #ccc', padding: '0.5rem'}}>B列</th>
              <th style={{border: '1px solid #ccc', padding: '0.5rem'}}>C列</th>
              <th style={{border: '1px solid #ccc', padding: '0.5rem'}}>D列</th>
              <th style={{border: '1px solid #ccc', padding: '0.5rem'}}>E列</th>
              <th style={{border: '1px solid #ccc', padding: '0.5rem'}}>F列</th>
              <th style={{border: '1px solid #ccc', padding: '0.5rem'}}>...</th>
            </tr>
            </thead>
            <tbody>
            <tr>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>学籍番号</td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>氏名</td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}></td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>学籍番号</td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>氏名</td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}></td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>...</td>
            </tr>
            <tr>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>2025001</td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>田中一郎</td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}></td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>2025002</td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>佐藤花子</td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}></td>
              <td style={{border: '1px solid #ccc', padding: '0.5rem'}}>...</td>
            </tr>
            </tbody>
          </table>
          <p style={{margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#666'}}>
            ※1行に複数組記載可能（学籍番号、氏名、空白の3列ごと繰り返し）
          </p>

          <h5 style={{margin: '0.5rem 0', color: '#1976d2'}}>3. 科目一覧シート</h5>
          <p style={{margin: '0.5rem 0', fontSize: '0.9rem', color: '#666'}}>
            ※空欄セルは上の行の値を引き継ぎます（組、分野、形式、単位、担当教員、暗証番号）
          </p>
          <div style={{overflowX: 'auto', marginBottom: '1rem'}}>
            <table style={{width: '100%', backgroundColor: '#fff', borderCollapse: 'collapse', fontSize: '0.75rem'}}>
              <thead>
              <tr style={{backgroundColor: '#e3f2fd'}}>
                <th style={{border: '1px solid #ccc', padding: '0.4rem 0.3rem'}}>A:通し</th>
                <th style={{border: '1px solid #ccc', padding: '0.4rem 0.3rem'}}>B:組</th>
                <th style={{border: '1px solid #ccc', padding: '0.4rem 0.3rem'}}>C:人数</th>
                <th style={{border: '1px solid #ccc', padding: '0.4rem 0.3rem'}}>D:試験</th>
                <th style={{border: '1px solid #ccc', padding: '0.4rem 0.3rem'}}>E:科目</th>
                <th style={{border: '1px solid #ccc', padding: '0.4rem 0.3rem'}}>F:分野</th>
                <th style={{border: '1px solid #ccc', padding: '0.4rem 0.3rem'}}>G:形式</th>
                <th style={{border: '1px solid #ccc', padding: '0.4rem 0.3rem'}}>H:単位</th>
                <th style={{border: '1px solid #ccc', padding: '0.4rem 0.3rem'}}>I:担当</th>
                <th style={{border: '1px solid #ccc', padding: '0.4rem 0.3rem'}}>J:-</th>
                <th style={{border: '1px solid #ccc', padding: '0.4rem 0.3rem'}}>K:暗証</th>
              </tr>
              </thead>
              <tbody>
              <tr>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>1</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>25K</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>30</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>定期</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>数学</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>専</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>講</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>2</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>山田太郎</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>1234</td>
              </tr>
              <tr style={{backgroundColor: '#fffacd'}}>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>2</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>物理</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
              </tr>
              <tr style={{backgroundColor: '#fffacd'}}>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>3</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>化学</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
              </tr>
              <tr>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>4</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>25L</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>28</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>定期</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>英語</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>他</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>講</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>2</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>佐藤花子</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}></td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem', textAlign: 'center'}}>5678</td>
              </tr>
              </tbody>
            </table>
          </div>
          <p style={{margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#666', lineHeight: '1.5'}}>
            <strong>例の説明:</strong><br/>
            • 1行目: 25K組の数学（専攻・講義）、山田太郎担当、暗証1234<br/>
            • 2～3行目: 25K組の物理・化学（上の行の組・分野・形式・担当・暗証を引き継ぎ）<br/>
            • 4行目: 25L組に変わり、英語（他・講義）、佐藤花子担当、暗証5678
          </p>
        </div>
      </div>

      <form onSubmit={handleUpload}>
        <div className="form-group">
          <label>Excelファイル (.xlsx):</label>
          <input
            id="bulk-import-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </div>
        {file && <p style={{color: '#666', fontSize: '0.9rem'}}>選択: {file.name}</p>}
        <button type="submit" disabled={isProcessing || !file}>
          {isProcessing ? '処理中...' : '一括登録を実行'}
        </button>
      </form>
    </div>
  )
}

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginUsername, setLoginUsername] = useState('')
  const [message, setMessage] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [token, setToken] = useState('')
  const [userRole, setUserRole] = useState('')
  const [activeTab, setActiveTab] = useState<'grades' | 'register' | 'bulkImport'>('grades')
  const [accessPin, setAccessPin] = useState('')
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [enrollmentScores, setEnrollmentScores] = useState<Record<number, { first: string; second: string; absence: string }>>({})
  const [gradesOptions, setGradesOptions] = useState<GradesOption[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [gradesList, setGradesList] = useState<StudentGrade[]>([])
  const [isLoadingGrades, setIsLoadingGrades] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsLoggedIn(true)
        setToken(data.token)
        setLoginUsername(username)
        setUsername('')
        setPassword('')
        setActiveTab('grades')
        setMessage('')

        if (data.token) {
          try {
            const payload = JSON.parse(atob(data.token.split('.')[1]))
            setUserRole(payload.role)
          } catch (e) {
            console.error('Token decode error', e)
          }
        }
      } else {
        setMessage(data.message || 'ログインに失敗しました')
      }
    } catch (error) {
      console.error(error)
      setMessage('サーバーとの通信エラーが発生しました')
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setLoginUsername('')
    setUsername('')
    setPassword('')
    setToken('')
    setUserRole('')
    setMessage('ログアウトしました')
    setActiveTab('grades')
  }

  const handleSearchSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setIsSearching(true)

    try {
      const response = await fetch(`http://localhost:3000/api/subject/search/${accessPin}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data: SearchResult = await response.json()

      if (response.ok && data.success) {
        setSearchResult(data)
        const initialScores: Record<number, { first: string; second: string; absence: string }> = {}
        if (data.enrollments) {
          data.enrollments.forEach(enrollment => {
            initialScores[enrollment.enrollmentId] = {
              first: enrollment.scoreFirstSemester?.toString() || '',
              second: enrollment.scoreSecondSemester?.toString() || '',
              absence: enrollment.absenceCount?.toString() || '0'
            }
          })
        }
        setEnrollmentScores(initialScores)
      } else {
        setMessage(data.message || '科目が見つかりません')
        setSearchResult(null)
      }
    } catch (error) {
      setMessage(`検索中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`)
      setSearchResult(null)
    } finally {
      setIsSearching(false)
    }
  }

  const handleScoreChange = (enrollmentId: number, field: 'first' | 'second' | 'absence', value: string) => {
    setEnrollmentScores(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [field === 'first' ? 'first' : field === 'second' ? 'second' : 'absence']: value
      }
    }))
  }

  useEffect(() => {
    if (isLoggedIn && token) {
      fetchGradesOptions()
    }
  }, [isLoggedIn, token])

  const fetchGradesOptions = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/grades/options', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setGradesOptions(data.options)

        if (data.options.length > 0) {
          setSelectedYear(data.options[0].year.toString())
          setSelectedClass(data.options[0].classes[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch grades options:', error)
    }
  }

  const handleFetchGradesList = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setIsLoadingGrades(true)

    try {
      const response = await fetch(`http://localhost:3000/api/grades/list/${selectedYear}/${selectedClass}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data: GradesListResponse = await response.json()

      if (response.ok && data.success) {
        setGradesList(data.students || [])
      } else {
        setMessage(data.message || '成績一覧の取得に失敗しました')
        setGradesList([])
      }
    } catch (error) {
      setMessage(`取得中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`)
      setGradesList([])
    } finally {
      setIsLoadingGrades(false)
    }
  }
  const handleSaveGrades = async () => {
    if (!searchResult || !searchResult.subject || !searchResult.enrollments) {
      setMessage('科目情報または履修者情報が見つかりません')
      return
    }

    try {
      const subject = searchResult.subject
      const enrollmentData = searchResult.enrollments.map(enrollment => ({
        enrollmentId: enrollment.enrollmentId,
        studentId: enrollment.studentId,
        studentCode: enrollment.studentCode,
        studentName: enrollment.studentName,
        scoreFirstSemester: enrollmentScores[enrollment.enrollmentId]?.first || '',
        scoreSecondSemester: enrollmentScores[enrollment.enrollmentId]?.second || '',
        absenceCount: enrollmentScores[enrollment.enrollmentId]?.absence || '0'
      }))

      const response = await fetch('http://localhost:3000/api/grades/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subjectId: subject.id,
          enrollmentData: enrollmentData
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage('成績を保存しました')
        setAccessPin('')
        setSearchResult(null)
        setEnrollmentScores({})
      } else {
        setMessage(data.message || '成績の保存に失敗しました')
      }
    } catch (error) {
      setMessage(`保存中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`)
    }
  }


  return (
    <div className="app-container">
      {isLoggedIn && (
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          backgroundColor: '#f0f0f0',
          marginBottom: '2rem'
        }}>
          <h1 style={{margin: 0, fontSize: '1.5rem'}}>成績管理システム</h1>
          <button onClick={handleLogout}>ログアウト</button>
        </header>
      )}

      {!isLoggedIn && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5'
        }}>
          <div className="auth-form" style={{
            backgroundColor: '#fff',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            width: '100%',
            maxWidth: '400px'
          }}>
            <h1 style={{
              textAlign: 'center',
              marginTop: 0,
              marginBottom: '2rem',
              color: '#333'
            }}>成績管理システム</h1>

            {message && (
              <p style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: '#ffebee',
                color: '#c62828',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                {message}
              </p>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group" style={{marginBottom: '1.5rem'}}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  ユーザーID
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="ユーザーIDを入力してください"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div className="form-group" style={{marginBottom: '2rem'}}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="パスワードを入力してください"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1565c0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1976d2'
                }}
              >
                ログイン
              </button>
            </form>

            <p style={{
              textAlign: 'center',
              marginTop: '1.5rem',
              color: '#666',
              fontSize: '0.9rem'
            }}>
              ログインしてシステムを利用してください
            </p>
          </div>
        </div>
      )}

      {isLoggedIn && (
        <div className="dashboard">
          <h2>ようこそ、{loginUsername} さん</h2>

          <div style={{ display: 'flex', borderBottom: '1px solid #ccc', marginBottom: '1rem', marginTop: '1rem' }}>
            <button
              onClick={() => { setActiveTab('grades'); setMessage('') }}
              style={{
                padding: '0.75rem 1.5rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'grades' ? '#fff' : '#f0f0f0',
                border: '1px solid #ccc',
                borderBottom: activeTab === 'grades' ? 'none' : '1px solid #ccc',
                marginBottom: '-1px',
                fontWeight: activeTab === 'grades' ? 'bold' : 'normal',
                borderTopLeftRadius: '4px',
                borderTopRightRadius: '4px'
              }}
            >
              成績一覧
            </button>

            {userRole === 'admin' && (
              <button
                onClick={() => { setActiveTab('bulkImport'); setMessage('') }}
                style={{
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'bulkImport' ? '#fff' : '#f0f0f0',
                  border: '1px solid #ccc',
                  borderBottom: activeTab === 'bulkImport' ? 'none' : '1px solid #ccc',
                  marginBottom: '-1px',
                  marginLeft: '0.5rem',
                  fontWeight: activeTab === 'bulkImport' ? 'bold' : 'normal',
                  borderTopLeftRadius: '4px',
                  borderTopRightRadius: '4px'
                }}
              >
                データ一括登録
              </button>
            )}

            {userRole === 'general' && (
              <button
                onClick={() => { setActiveTab('register'); setMessage('') }}
                style={{
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'register' ? '#fff' : '#f0f0f0',
                  border: '1px solid #ccc',
                  borderBottom: activeTab === 'register' ? 'none' : '1px solid #ccc',
                  marginBottom: '-1px',
                  marginLeft: '0.5rem',
                  fontWeight: activeTab === 'register' ? 'bold' : 'normal',
                  borderTopLeftRadius: '4px',
                  borderTopRightRadius: '4px'
                }}
              >
                成績登録
              </button>
            )}
          </div>

          <div className="tab-content" style={{ padding: '1rem', border: '1px solid #ccc', borderTop: 'none' }}>
            {message && (
              <p
                className="message"
                style={{
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  backgroundColor: message.includes('失敗') || message.includes('エラー') ? '#ffebee' : '#e8f5e9',
                  color: message.includes('失敗') || message.includes('エラー') ? '#c62828' : '#2e7d32',
                  borderRadius: '4px',
                  whiteSpace: 'pre-line'
                }}
              >
                {message}
              </p>
            )}

            {activeTab === 'grades' && (
              <div>
                <h3>成績一覧</h3>
                <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                  <p style={{ margin: '0 0 1rem 0', color: '#333', fontWeight: '500' }}>
                    学年とクラスを選択してください
                  </p>
                  <form onSubmit={handleFetchGradesList} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>学年</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(e.target.value)
                          const selected = gradesOptions.find(opt => opt.year.toString() === e.target.value)
                          if (selected && selected.classes.length > 0) {
                            setSelectedClass(selected.classes[0])
                          }
                        }}
                        style={{
                          padding: '0.75rem',
                          fontSize: '1rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">選択してください</option>
                        {gradesOptions.map(option => (
                          <option key={option.year} value={option.year}>
                            {option.year}年
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>クラス</label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        style={{
                          padding: '0.75rem',
                          fontSize: '1rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">選択してください</option>
                        {selectedYear && gradesOptions
                          .find(opt => opt.year.toString() === selectedYear)
                          ?.classes.map(cls => (
                            <option key={cls} value={cls}>
                              {cls}組
                            </option>
                          ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoadingGrades || !selectedYear || !selectedClass}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isLoadingGrades || !selectedYear || !selectedClass ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        opacity: isLoadingGrades || !selectedYear || !selectedClass ? 0.6 : 1,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isLoadingGrades ? '取得中...' : '表示'}
                    </button>
                  </form>
                </div>

                {gradesList.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: '1rem' }}>
                      {selectedYear}年 {selectedClass}組 成績一覧 ({gradesList.length}名)
                    </h4>
                    <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: '1px solid #ddd',
                        fontSize: '0.85rem',
                        backgroundColor: '#fff'
                      }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'left', minWidth: '100px' }}>学籍番号</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'left', minWidth: '150px' }}>氏名</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'left', minWidth: '200px' }}>科目名</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center', minWidth: '60px' }}>分野</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center', minWidth: '60px' }}>形式</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center', minWidth: '50px' }}>単位</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center', minWidth: '70px' }}>1学期</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center', minWidth: '70px' }}>2学期</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center', minWidth: '60px' }}>欠課</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradesList.map((student, studentIdx) => (
                            student.grades.length > 0 && student.grades.map((grade, gradeIdx) => (
                              <tr
                                key={`${student.studentId}-${grade.subjectId}`}
                                style={{
                                  backgroundColor: (studentIdx + gradeIdx) % 2 === 0 ? '#fff' : '#f9f9f9',
                                  borderBottom: '1px solid #ddd'
                                }}
                              >
                                {gradeIdx === 0 && (
                                  <>
                                    <td
                                      style={{
                                        border: '1px solid #ddd',
                                        padding: '0.75rem',
                                        fontWeight: '500',
                                        rowSpan: student.grades.length
                                      } as React.CSSProperties}
                                    >
                                      {student.studentCode}
                                    </td>
                                    <td
                                      style={{
                                        border: '1px solid #ddd',
                                        padding: '0.75rem',
                                        rowSpan: student.grades.length
                                      } as React.CSSProperties}
                                    >
                                      {student.studentName}
                                    </td>
                                  </>
                                )}
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem' }}>
                                  {grade.subjectName}
                                </td>
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem' }}>
                                  {grade.category === 'S' ? '専' : '他'}
                                </td>
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem' }}>
                                  {grade.classType === 'Lecture' ? '講' : '演'}
                                </td>
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center' }}>
                                  {grade.credits}
                                </td>
                                <td style={{
                                  border: '1px solid #ddd',
                                  padding: '0.75rem',
                                  textAlign: 'center',
                                  backgroundColor: grade.scoreFirstSemester ? '#e8f5e9' : '#f5f5f5',
                                  fontWeight: 'bold'
                                }}>
                                  {grade.scoreFirstSemester ?? '-'}
                                </td>
                                <td style={{
                                  border: '1px solid #ddd',
                                  padding: '0.75rem',
                                  textAlign: 'center',
                                  backgroundColor: grade.scoreSecondSemester ? '#e8f5e9' : '#f5f5f5',
                                  fontWeight: 'bold'
                                }}>
                                  {grade.scoreSecondSemester ?? '-'}
                                </td>
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center' }}>
                                  {grade.absenceCount}
                                </td>
                              </tr>
                            ))
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'register' && userRole === 'general' && (
              <div>
                <h3>成績登録</h3>
                <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                  <p style={{ margin: '0 0 1rem 0', color: '#333', fontWeight: '500' }}>
                    科目の暗証番号を入力して、成績登録データを検索してください
                  </p>
                  <form onSubmit={handleSearchSubject} style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        placeholder="4桁の暗証番号を入力"
                        value={accessPin}
                        onChange={(e) => setAccessPin(e.target.value)}
                        maxLength={4}
                        disabled={isSearching}
                        style={{
                          padding: '0.75rem',
                          fontSize: '1rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching || !accessPin}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isSearching || !accessPin ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        opacity: isSearching || !accessPin ? 0.6 : 1
                      }}
                    >
                      {isSearching ? '検索中...' : '検索'}
                    </button>
                  </form>
                </div>

                {searchResult && searchResult.success && searchResult.subject && searchResult.enrollments && (
                  <div style={{ marginTop: '2rem' }}>
                    <div style={{ backgroundColor: '#e3f2fd', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>科目情報</h4>
                      <table style={{ width: '100%', fontSize: '0.9rem' }}>
                        <tbody>
                        <tr>
                          <td style={{ fontWeight: 'bold', paddingRight: '1rem' }}>科目名:</td>
                          <td>{searchResult.subject.name}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', paddingRight: '1rem' }}>対象学年:</td>
                          <td>{searchResult.subject.group.year}年 {searchResult.subject.group.name}組</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', paddingRight: '1rem' }}>分野:</td>
                          <td>{searchResult.subject.category === 'S' ? '専攻' : 'その他'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', paddingRight: '1rem' }}>形式:</td>
                          <td>{searchResult.subject.classType === 'Lecture' ? '講義' : '演習'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', paddingRight: '1rem' }}>単位:</td>
                          <td>{searchResult.subject.credits}単位</td>
                        </tr>
                        </tbody>
                      </table>
                    </div>

                    <h4 style={{ marginBottom: '1rem' }}>成績入力 ({searchResult.enrollments.length}名)</h4>
                    <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: '1px solid #ddd',
                        fontSize: '0.9rem',
                        backgroundColor: '#fff'
                      }}>
                        <thead>
                        <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                          <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'left', minWidth: '100px' }}>学籍番号</th>
                          <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'left', minWidth: '150px' }}>氏名</th>
                          <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center', minWidth: '80px' }}>1学期</th>
                          <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center', minWidth: '80px' }}>2学期</th>
                          <th style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center', minWidth: '80px' }}>欠課数</th>
                        </tr>
                        </thead>
                        <tbody>
                        {searchResult.enrollments.map((enrollment, idx) => (
                          <tr key={enrollment.enrollmentId} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom: '1px solid #ddd' }}>
                            <td style={{ border: '1px solid #ddd', padding: '0.75rem', fontWeight: '500' }}>
                              {enrollment.studentCode}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '0.75rem' }}>
                              {enrollment.studentName}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '0.5rem', textAlign: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={enrollmentScores[enrollment.enrollmentId]?.first || ''}
                                onChange={(e) => handleScoreChange(enrollment.enrollmentId, 'first', e.target.value)}
                                placeholder="-"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  textAlign: 'center',
                                  border: '1px solid #ddd',
                                  borderRadius: '3px',
                                  boxSizing: 'border-box',
                                  fontSize: '0.9rem'
                                }}
                              />
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '0.5rem', textAlign: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={enrollmentScores[enrollment.enrollmentId]?.second || ''}
                                onChange={(e) => handleScoreChange(enrollment.enrollmentId, 'second', e.target.value)}
                                placeholder="-"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  textAlign: 'center',
                                  border: '1px solid #ddd',
                                  borderRadius: '3px',
                                  boxSizing: 'border-box',
                                  fontSize: '0.9rem'
                                }}
                              />
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '0.5rem', textAlign: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                value={enrollmentScores[enrollment.enrollmentId]?.absence || '0'}
                                onChange={(e) => handleScoreChange(enrollment.enrollmentId, 'absence', e.target.value)}
                                placeholder="0"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  textAlign: 'center',
                                  border: '1px solid #ddd',
                                  borderRadius: '3px',
                                  boxSizing: 'border-box',
                                  fontSize: '0.9rem'
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setAccessPin('')
                          setSearchResult(null)
                          setEnrollmentScores({})
                        }}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: '#757575',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        クリア
                      </button>
                      <button
                        onClick={handleSaveGrades}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: '#4caf50',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        成績を保存
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'bulkImport' && userRole === 'admin' && (
              <BulkImportRegister token={token} onSuccess={setMessage} onError={setMessage} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App