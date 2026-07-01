import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hms_user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) localStorage.setItem('hms_user', JSON.stringify(user))
    else localStorage.removeItem('hms_user')
  }, [user])

  const login = async (username, password) => {
    setLoading(true)
    try {
      const { data } = await authApi.login(username, password)
      localStorage.setItem('hms_token', data.token)
      const u = { username: data.username, fullName: data.fullName, role: data.role }
      setUser(u)
      return u
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('hms_token')
    localStorage.removeItem('hms_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
