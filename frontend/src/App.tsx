import { useState } from 'react'
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

// 統合一括登録コンポーネント
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
          <table style={{width: '100%', backgroundColor: '#fff', borderCollapse: 'collapse', fontSize: '0.75rem', marginBottom: '1rem'}}>
            <thead>
              <tr style={{backgroundColor: '#e3f2fd'}}>
                <th style={{border: '1px solid #ccc', padding: '0.3rem'}}>A:年度</th>
                <th style={{border: '1px solid #ccc', padding: '0.3rem'}}>B:科目名</th>
                <th style={{border: '1px solid #ccc', padding: '0.3rem'}}>C:分野</th>
                <th style={{border: '1px solid #ccc', padding: '0.3rem'}}>D:形式</th>
                <th style={{border: '1px solid #ccc', padding: '0.3rem'}}>E:単位</th>
                <th style={{border: '1px solid #ccc', padding: '0.3rem'}}>F:対象年度</th>
                <th style={{border: '1px solid #ccc', padding: '0.3rem'}}>G:対象クラス</th>
                <th style={{border: '1px solid #ccc', padding: '0.3rem'}}>H:担当教員</th>
                <th style={{border: '1px solid #ccc', padding: '0.3rem'}}>I:暗証番号</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>2025</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>数学</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>S</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>Lecture</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>2</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>2025</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>25K</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>山田太郎</td>
                <td style={{border: '1px solid #ccc', padding: '0.3rem'}}>1234</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#d32f2f', fontWeight: 'bold'}}>
          ※必要なシートのみ含めてください（不要なシートは省略可能）<br/>
          ※登録順序: 教員 → 学生 → 科目
        </p>
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
  const [activeTab, setActiveTab] = useState<'grades' | 'bulkImport'>('grades')

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

      {!isLoggedIn && <h1>成績管理システム</h1>}

      {isLoggedIn ? (
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
                <p style={{ color: '#666' }}>現在、登録されている成績データはありません。</p>
              </div>
            )}

            {activeTab === 'bulkImport' && userRole === 'admin' && (
              <BulkImportRegister token={token} onSuccess={setMessage} onError={setMessage} />
            )}
          </div>
        </div>
      ) : (
        <div className="auth-form">
          <h2>ログイン</h2>
          {message && <p className="message">{message}</p>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>ユーザーID:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>パスワード:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit">ログイン</button>
          </form>
        </div>
      )}
    </div>
  )
}

export default App