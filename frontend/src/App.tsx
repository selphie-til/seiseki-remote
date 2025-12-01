// frontend/src/App.tsx
import {useState} from 'react'

// API Response Type
interface LoginResponse {
    success: boolean;
    message: string;
}

// LoginForm Component
interface LoginFormProps {
    onLogin: (username: string, password: string) => void;
    isLoading: boolean;
    error: string | null;
}

const LoginForm = ({onLogin, isLoading, error}: LoginFormProps) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onLogin(username, password)
    }

    return (
        <div style={{border: '1px solid #ccc', padding: '20px', marginTop: '20px', maxWidth: '300px'}}>
            <h3>ログイン</h3>
            {error && (
                <div style={{
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    padding: '10px',
                    marginBottom: '10px',
                    borderRadius: '4px'
                }}>
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div style={{marginBottom: '10px'}}>
                    <label htmlFor="username" style={{display: 'block'}}>ユーザー名:</label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        disabled={isLoading}
                        style={{width: '100%', padding: '8px', boxSizing: 'border-box'}}
                    />
                </div>
                <div style={{marginBottom: '10px'}}>
                    <label htmlFor="password" style={{display: 'block'}}>パスワード:</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        style={{width: '100%', padding: '8px', boxSizing: 'border-box'}}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                        width: '100%',
                        padding: '10px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        backgroundColor: isLoading ? '#ccc' : '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                    }}
                >
                    {isLoading ? 'ログイン中...' : 'ログイン'}
                </button>
            </form>
        </div>
    )
}

// Dashboard Component (ログイン成功画面)
interface DashboardProps {
    username: string;
    onLogout: () => void;
}

const Dashboard = ({username, onLogout}: DashboardProps) => {
    return (
        <div style={{
            padding: '20px',
            maxWidth: '500px',
            margin: '20px auto',
            textAlign: 'center'
        }}>
            <div style={{
                backgroundColor: '#e8f5e9',
                padding: '30px',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h2 style={{color: '#2e7d32', marginTop: 0}}>🎉 ログイン成功!</h2>
                <p style={{fontSize: '18px', color: '#333'}}>
                    ようこそ、<strong>{username}</strong> さん！
                </p>
            </div>
            <div style={{
                backgroundColor: '#f5f5f5',
                padding: '20px',
                borderRadius: '8px'
            }}>
                <h3>ダッシュボード</h3>
                <p>ここにログイン後のコンテンツが表示されます。</p>
            </div>
            <button
                onClick={onLogout}
                style={{
                    marginTop: '20px',
                    padding: '10px 30px',
                    backgroundColor: '#757575',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                ログアウト
            </button>
        </div>
    )
}

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [loggedInUser, setLoggedInUser] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (username: string, password: string) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({username, password}),
            })

            const data: LoginResponse = await response.json()

            if (data.success) {
                setIsLoggedIn(true)
                setLoggedInUser(username)
            } else {
                setError(data.message)
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('サーバーに接続できませんでした。')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = () => {
        setIsLoggedIn(false)
        setLoggedInUser('')
        setError(null)
    }

    return (
        <div>
            {isLoggedIn ? (
                <Dashboard username={loggedInUser} onLogout={handleLogout}/>
            ) : (
                <LoginForm onLogin={handleLogin} isLoading={isLoading} error={error}/>
            )}
        </div>
    )
}

export default App

