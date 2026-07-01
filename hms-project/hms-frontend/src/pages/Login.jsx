import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials')
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">G</div>
        <h1>GrandStay HMS</h1>
        <p>Sign in to your account</p>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="login-hint">
          <strong>Demo accounts:</strong><br />
          admin / admin123<br />
          manager / manager123<br />
          reception / rec123
        </div>
      </div>
    </div>
  )
}
