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

    // Don't retry /auth/me requests - let them fail gracefully
    if (originalRequest?.url?.includes('/auth/me')) {
      // Return a rejected promise that can be caught by the API wrapper
      return Promise.reject(error)
    }

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
  updateStatus: (id: string) =>
    api.post(`/orders/${id}/update-status`).then(r => r.data),
}

// =======================
// CHECKOUT API (DEPRECATED - Use paymentIntentAPI instead)
// =======================
// NOTE: This API is deprecated. Use paymentIntentAPI for Stripe Elements integration.
// Keeping for backward compatibility but should not be used in new code.
export const checkoutAPI = {
  createSession: (orderId: string) => {
    console.warn('[DEPRECATED] checkoutAPI.createSession is deprecated. Use paymentIntentAPI.create instead.');
    return api.post('/checkout', { orderId })
      .then(r => {
        console.log('Checkout session created:', r.data);
        return r.data;
      })
      .catch(err => {
        console.error('Checkout API error:', err);
        console.error('Error response:', err.response?.data);
        throw err; // Re-throw to be handled by caller
      });
  },
}

// =======================
// PAYMENT INTENT API (for Stripe Elements)
// =======================
export const paymentIntentAPI = {
  create: (orderId: string) =>
    api.post('/payment-intent', { orderId })
      .then(r => {
        console.log('Payment intent created:', r.data);
        return r.data;
      })
      .catch(err => {
        console.error('Payment intent API error:', err);
        console.error('Error response:', err.response?.data);
        throw err; // Re-throw to be handled by caller
      }),
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
  getConversation: (id: string) =>
    api.get(`/contact/${id}/conversation`).then(r => r.data),
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
  markAsSeen: (id: string) =>
    api.post(`/messages/${id}/seen`).then(r => r.data),
  delete: (id: string, forEveryone: boolean = false) =>
    api.delete(`/messages/${id}?forEveryone=${forEveryone}`).then(r => r.data),
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

// =======================
// CATEGORIES API
// =======================
export const categoriesAPI = {
  getAll: () => api.get('/categories').then(r => r.data),
  create: (data: any) => api.post('/categories', data).then(r => r.data),
  delete: (id: string) => api.delete(`/categories/${id}`).then(r => r.data),
}

export default api
