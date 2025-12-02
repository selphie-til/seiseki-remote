import { useState } from 'react'
import './App.css'

function App() {
  const [username, setUsername] = useState('') // email -> username
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [token, setToken] = useState('') // トークン管理用
  const [userRole, setUserRole] = useState('') // ロール管理用
  const [mode, setMode] = useState<'login' | 'register'>('login')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    try {
      // バックエンドのポートに合わせてURLを指定（環境変数がなければ3000と仮定）
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }), // email -> username
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsLoggedIn(true)
        setMessage(data.message)
        setToken(data.token) // トークンを保存
        
        // トークンからロールを取得（簡易的なデコード）
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
        body: JSON.stringify({ username, password, name }), // email -> username
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage(data.message)
        // 管理者が登録を行うため、ログイン画面には遷移させない
        setName('')
        setUsername('') // email -> username
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
    setUsername('') // email -> username
    setPassword('')
    setToken('')
    setUserRole('')
    setMessage('ログアウトしました')
    setMode('login')
  }

  return (
    <div className="app-container">
      <h1>成績管理システム</h1>
      
      {isLoggedIn ? (
        <div className="dashboard">
          <h2>ようこそ、{username} さん ({userRole === 'admin' ? '管理者' : '一般ユーザー'})</h2>
          <p>{message}</p>
          
          {/* 管理者のみ新規登録フォームを表示 */}
          {userRole === 'admin' && (
            <div className="admin-section" style={{border: '1px solid #ccc', padding: '1rem', marginTop: '1rem'}}>
              <h3>新規ユーザー登録 (管理者用)</h3>
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
          )}

          <div style={{marginTop: '1rem'}}>
            <button onClick={handleLogout}>ログアウト</button>
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
