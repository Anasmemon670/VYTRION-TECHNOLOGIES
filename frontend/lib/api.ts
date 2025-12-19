import axios, { AxiosError, AxiosInstance } from 'axios'

/**
 * IMPORTANT:
 * Frontend ENV (Vercel):
 * NEXT_PUBLIC_API_URL = https://victor-backend-.vercel.app/api
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// =======================
// REQUEST INTERCEPTOR
// =======================
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// =======================
// RESPONSE INTERCEPTOR
// =======================
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (typeof window === 'undefined') {
      return Promise.reject(error)
    }

    const originalRequest: any = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        const { token, refreshToken: newRefreshToken } = res.data

        localStorage.setItem('accessToken', token)
        localStorage.setItem('refreshToken', newRefreshToken)

        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

// =======================
// AUTH API
// =======================
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data).then(r => r.data),
  login: (data: any) => api.post('/auth/login', data).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
  getProfile: () => api.get('/auth/me').then(r => r.data),
  updateProfile: (data: any) => api.put('/auth/profile', data).then(r => r.data),
  forgotPassword: (data: any) => api.post('/auth/forgot-password', data).then(r => r.data),
  resetPassword: (data: any) => api.post('/auth/reset-password', data).then(r => r.data),
}

// =======================
// ADMIN API
// =======================
export const adminAPI = {
  getStats: (params?: any) =>
    api.get('/admin/stats', { params }).then(r => r.data),
}

// =======================
// PRODUCTS API
// =======================
export const productsAPI = {
  getAll: (params?: any) =>
    api.get('/products', { params }).then(r => r.data),
  getById: (id: string) =>
    api.get(`/products/${id}`).then(r => r.data),
  create: (data: any) =>
    api.post('/products', data).then(r => r.data),
  update: (id: string, data: any) =>
    api.put(`/products/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/products/${id}`).then(r => r.data),
}

// =======================
// ORDERS API
// =======================
export const ordersAPI = {
  getAll: (params?: any) =>
    api.get('/orders', { params }).then(r => r.data),
  getById: (id: string) =>
    api.get(`/orders/${id}`).then(r => r.data),
  create: (data: any) =>
    api.post('/orders', data).then(r => r.data),
  update: (id: string, data: any) =>
    api.put(`/orders/${id}`, data).then(r => r.data),
}

// =======================
// CHECKOUT API
// =======================
export const checkoutAPI = {
  createSession: (orderId: string) =>
    api.post('/checkout', { orderId }).then(r => r.data),
}

// =======================
// BLOG API
// =======================
export const blogAPI = {
  getAll: (params?: any) =>
    api.get('/blog', { params }).then(r => r.data),
  getById: (id: string) =>
    api.get(`/blog/${id}`).then(r => r.data),
  create: (data: any) =>
    api.post('/blog', data).then(r => r.data),
  update: (id: string, data: any) =>
    api.put(`/blog/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/blog/${id}`).then(r => r.data),
}

// =======================
// SERVICES API
// =======================
export const servicesAPI = {
  getAll: (params?: any) =>
    api.get('/services', { params }).then(r => r.data),
  getById: (id: string) =>
    api.get(`/services/${id}`).then(r => r.data),
  create: (data: any) =>
    api.post('/services', data).then(r => r.data),
  update: (id: string, data: any) =>
    api.put(`/services/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/services/${id}`).then(r => r.data),
}

// =======================
// PROJECTS API
// =======================
export const projectsAPI = {
  getAll: (params?: any) =>
    api.get('/projects', { params }).then(r => r.data),
  getById: (id: string) =>
    api.get(`/projects/${id}`).then(r => r.data),
  create: (data: any) =>
    api.post('/projects', data).then(r => r.data),
  update: (id: string, data: any) =>
    api.put(`/projects/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/projects/${id}`).then(r => r.data),
}

// =======================
// CONTACT API
// =======================
export const contactAPI = {
  create: (data: any) =>
    api.post('/contact', data).then(r => r.data),
  getAll: (params?: any) =>
    api.get('/contact', { params }).then(r => r.data),
  update: (id: string, data: any) =>
    api.put(`/contact/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/contact/${id}`).then(r => r.data),
  reply: (id: string, data: any) =>
    api.post(`/contact/${id}/reply`, data).then(r => r.data),
}

// =======================
// MESSAGES API
// =======================
export const messagesAPI = {
  getAll: (params?: any) =>
    api.get('/messages', { params }).then(r => r.data),
  create: (data: any) =>
    api.post('/messages', data).then(r => r.data),
  update: (id: string, data: any) =>
    api.put(`/messages/${id}`, data).then(r => r.data),
}

// =======================
// WISHLIST API
// =======================
export const wishlistAPI = {
  getAll: () => api.get('/wishlist').then(r => r.data),
  add: (productId: string) =>
    api.post('/wishlist', { productId }).then(r => r.data),
  remove: (productId: string) =>
    api.delete(`/wishlist/${productId}`).then(r => r.data),
}

export default api
