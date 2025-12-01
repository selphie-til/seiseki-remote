// frontend/src/App.tsx
import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    // 相対パスでリクエストする -> Viteがプロキシしてくれる
    fetch('/api/hello')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error(err))
  }, [])

  return (
    <div>
      <h1>Frontend: React</h1>
      <h2>Backend says: {message}</h2>
    </div>
  )
}

export default App

