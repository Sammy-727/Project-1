import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hms_token')
      localStorage.removeItem('hms_user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
}

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  recentBookings: () => api.get('/dashboard/recent-bookings'),
  recentPayments: () => api.get('/dashboard/recent-payments'),
}

export const roomsApi = {
  list: (params) => api.get('/rooms', { params }),
  types: () => api.get('/rooms/types'),
  create: (data) => api.post('/rooms', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  remove: (id) => api.delete(`/rooms/${id}`),
}

export const guestsApi = {
  list: (params) => api.get('/guests', { params }),
  get: (id) => api.get(`/guests/${id}`),
  create: (data) => api.post('/guests', data),
  update: (id, data) => api.put(`/guests/${id}`, data),
  remove: (id) => api.delete(`/guests/${id}`),
}

export const bookingsApi = {
  list: (params) => api.get('/bookings', { params }),
  arrivals: () => api.get('/bookings/arrivals'),
  active: () => api.get('/bookings/active'),
  create: (data) => api.post('/bookings', data),
  checkIn: (id) => api.post(`/bookings/${id}/checkin`),
  checkOut: (id, data) => api.post(`/bookings/${id}/checkout`, data),
  cancel: (id) => api.post(`/bookings/${id}/cancel`),
}

export const paymentsApi = {
  list: () => api.get('/payments'),
  revenue: () => api.get('/payments/revenue'),
  create: (data) => api.post('/payments', data),
}

export const reportsApi = {
  summary: () => api.get('/reports/summary'),
}

export default api
