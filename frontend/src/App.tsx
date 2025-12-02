import { useState } from 'react'
import './App.css'

// UserManagement コンポーネントを App の外に定義
// 必要なデータと関数を props として受け取るように定義
interface UserManagementProps {
  username: string;
  setUsername: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  handleRegister: (e: React.FormEvent) => void;
}

const UserManagement = ({ 
  username, 
  setUsername, 
  name, 
  setName, 
  password, 
  setPassword, 
  handleRegister, 
}: UserManagementProps) => (
  <div className="admin-section" style={{border: '1px solid #ccc', padding: '1rem', marginTop: '1rem'}}>
    <h3>新規ユーザー登録</h3>
    <form onSubmit={handleRegister}>
      <div className="form-group">
        <label>ユーザーID (ログイン用):</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>表示名 (氏名):</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
      <button type="submit">ユーザー登録</button>
    </form>
  </div>
)

// CSV一括登録コンポーネント（ここに追加）
interface BulkRegisterProps {
  token: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

// 型定義を追加
interface BulkRegisterResult {
  username: string;
  success: boolean;
  message: string;
}

interface BulkRegisterResponse {
  success: boolean;
  message: string;
  results?: BulkRegisterResult[];
}

const BulkRegister = ({ token, onSuccess, onError }: BulkRegisterProps) => {
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
      console.log('=== CSV処理開始 ===')
      
      // CSVファイルを読み込む
      const text = await file.text()
      console.log('ファイル内容:', text)
      console.log('ファイル内容の長さ:', text.length)
      
      // 改行コードを統一して分割
      const lines = text
        .replace(/\r\n/g, '\n')  // Windows形式をUnix形式に統一
        .replace(/\r/g, '\n')    // 古いMac形式もUnix形式に統一
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')
      
      console.log('読み込んだ行数:', lines.length)
      console.log('全行:', lines)
      
      if (lines.length < 2) {
        onError('CSVファイルにデータが含まれていません（ヘッダーのみ、またはデータ行がありません）')
        setIsProcessing(false)
        return
      }
      
      // 1行目はヘッダーなのでスキップ
      const dataLines = lines.slice(1)
      console.log('データ行数:', dataLines.length)
      
      const users = dataLines.map((line, index) => {
        console.log(`処理中の行 ${index + 2}:`, line)
        
        const parts = line.split(',')
        console.log(`  分割結果:`, parts)
        
        if (parts.length < 2) {
          console.warn(`  警告: カンマ区切りが不正`)
          return null
        }
        
        const username = parts[0].trim()
        const password = parts[1].trim()
        
        console.log(`  username: "${username}", password: "${password}"`)
        
        if (!username || !password) {
          console.warn(`  警告: ユーザー名またはパスワードが空`)
          return null
        }
        
        return {
          username,
          password,
          name: username
        }
      }).filter(user => user !== null)

      console.log('有効なユーザー数:', users.length)
      console.log('ユーザーデータ:', JSON.stringify(users, null, 2))

      if (users.length === 0) {
        onError('有効なユーザーデータがありません。各行が「ユーザー名,パスワード」の形式になっているか確認してください。')
        setIsProcessing(false)
        return
      }

      console.log('バックエンドにPOSTリクエスト送信中...')
      console.log('トークン:', token ? '存在する' : '存在しない')
      
      // バックエンドにPOST
      const response = await fetch('http://localhost:3000/api/register/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ users }),
      })

      console.log('レスポンスステータス:', response.status)
      console.log('レスポンスOK:', response.ok)
      
      const data: BulkRegisterResponse = await response.json() // 型アサーションを追加
      console.log('レスポンスデータ:', data)

      if (response.ok && data.success) {
        const detailMessage = data.results
          ?.map((r) => `${r.username}: ${r.message}`) // ここで r の型が推論されるので : any は不要
          .join('\n') || ''
        onSuccess(`${data.message}\n\n詳細:\n${detailMessage}`)
        setFile(null)
        // ファイル入力をリセット
        const fileInput = document.getElementById('csv-file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        onError(data.message || '一括登録に失敗しました')
      }
    } catch (error) {
      console.error('=== エラー詳細 ===')
      console.error('エラーオブジェクト:', error)
      console.error('エラーメッセージ:', error instanceof Error ? error.message : String(error))
      console.error('エラースタック:', error instanceof Error ? error.stack : 'スタックトレースなし')
      
      onError(`ファイル処理中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsProcessing(false)
      console.log('=== CSV処理終了 ===')
    }
  }

  return (
    <div className="bulk-register-section" style={{border: '1px solid #ccc', padding: '1rem', marginTop: '1rem'}}>
      <h3>CSV一括登録</h3>
      <div style={{backgroundColor: '#f5f5f5', padding: '1rem', marginBottom: '1rem', borderRadius: '4px'}}>
        <h4 style={{marginTop: 0}}>CSVファイルの形式</h4>
        <p style={{margin: '0.5rem 0', fontSize: '0.9rem'}}>
          1行目: ヘッダー（ユーザー名,パスワード）<br/>
          2行目以降: 各ユーザーのデータ
        </p>
        <pre style={{backgroundColor: '#fff', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem'}}>
{`ユーザー名,パスワード
user1,password1
user2,password2
user3,password3`}
        </pre>
        <p style={{margin: '0.5rem 0', fontSize: '0.85rem', color: '#666'}}>
          ※ブラウザのコンソール（F12キー）で詳細なログを確認できます
        </p>
      </div>
      <form onSubmit={handleUpload}>
        <div className="form-group">
          <label>CSVファイル:</label>
          <input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </div>
        {file && (
          <p style={{color: '#666', fontSize: '0.9rem'}}>
            選択されたファイル: {file.name}
          </p>
        )}
        <button type="submit" disabled={isProcessing || !file}>
          {isProcessing ? '処理中...' : 'アップロード'}
        </button>
      </form>
    </div>
  )
}

// function App() 以降は続く...
function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  
  // ログインユーザー情報のstate（分離）
  const [loginUsername, setLoginUsername] = useState('')
  
  const [message, setMessage] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [token, setToken] = useState('')
  const [userRole, setUserRole] = useState('')
  
  // アクティブなタブを管理 ('grades' | 'users')
  const [activeTab, setActiveTab] = useState<'grades' | 'users' | 'bulkUsers'>('grades')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsLoggedIn(true)
        setMessage(data.message)
        setToken(data.token)
        
        setIsLoggedIn(true)
        setMessage(data.message)
        setToken(data.token)
        setLoginUsername(username)
        setUsername('')
        setPassword('')
        setActiveTab('grades') // ログイン時は必ず成績一覧タブを表示
        setMessage('') // ログイン成功メッセージは表示しない
    
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    try {
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, password, name }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage(data.message)
        setName('')
        setUsername('') 
        setPassword('')
      } else {
        setMessage(data.message || '登録に失敗しました')
      }
    } catch (error) {
      console.error(error)
      setMessage('サーバーとの通信エラーが発生しました')
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setLoginUsername('') // ログイン情報をクリア
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
          
          {/* タブナビゲーション */}
          <div style={{ display: 'flex', borderBottom: '1px solid #ccc', marginBottom: '1rem', marginTop: '1rem' }}>
            <button
              onClick={() => {
                setActiveTab('grades')
                setMessage('') // タブ切替時にメッセージをクリア
              }}
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
                onClick={() => {
                  setActiveTab('users')
                  setMessage('') // タブ切替時にメッセージをクリア
                  // 新規ユーザー登録フォームの入力をクリア
                  setUsername('')
                  setPassword('')
                  setName('')
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'users' ? '#fff' : '#f0f0f0',
                  border: '1px solid #ccc',
                  borderBottom: activeTab === 'users' ? 'none' : '1px solid #ccc',
                  marginBottom: '-1px',
                  marginLeft: '0.5rem',
                  fontWeight: activeTab === 'users' ? 'bold' : 'normal',
                  borderTopLeftRadius: '4px',
                  borderTopRightRadius: '4px'
                }}
              >
                新規ユーザー登録
              </button>
            )}

            {userRole === 'admin' && (
              <button
                onClick={() => {
                  setActiveTab('bulkUsers')
                  setMessage('') // タブ切替時にメッセージをクリア
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'bulkUsers' ? '#fff' : '#f0f0f0',
                  border: '1px solid #ccc',
                  borderBottom: activeTab === 'bulkUsers' ? 'none' : '1px solid #ccc',
                  marginBottom: '-1px',
                  marginLeft: '0.5rem',
                  fontWeight: activeTab === 'bulkUsers' ? 'bold' : 'normal',
                  borderTopLeftRadius: '4px',
                  borderTopRightRadius: '4px'
                }}
              >
                CSV一括登録
              </button>
            )}
          </div>

          <div className="tab-content" style={{ padding: '1rem', border: '1px solid #ccc', borderTop: 'none' }}>
            {/* メッセージ表示エリア */}
            {message && (
              <p 
                className="message" 
                style={{
                  marginBottom: '1rem', 
                  padding: '0.5rem',
                  backgroundColor: message.includes('失敗') || message.includes('エラー') ? '#ffebee' : '#e8f5e9',
                  color: message.includes('失敗') || message.includes('エラー') ? '#c62828' : '#2e7d32',
                  borderRadius: '4px'
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

            {activeTab === 'users' && userRole === 'admin' && (
              <UserManagement
                username={username}
                setUsername={setUsername}
                name={name}
                setName={setName}
                password={password}
                setPassword={setPassword}
                handleRegister={handleRegister}
              />
            )}

            {activeTab === 'bulkUsers' && userRole === 'admin' && (
              <BulkRegister
                token={token}
                onSuccess={setMessage}
                onError={setMessage}
              />
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