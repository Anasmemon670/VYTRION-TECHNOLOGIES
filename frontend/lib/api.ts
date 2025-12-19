import axios, { AxiosError, AxiosInstance } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Only handle token refresh on client side
    if (typeof window === 'undefined') {
      return Promise.reject(error)
    }

    const originalRequest = error.config as any

    // If error is 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) {
          // No refresh token, logout user
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          window.location.href = '/login'
          return Promise.reject(error)
        }

        // Try to refresh token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        const { token, refreshToken: newRefreshToken } = response.data

        // Update tokens
        localStorage.setItem('accessToken', token)
        localStorage.setItem('refreshToken', newRefreshToken)

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API functions
export const authAPI = {
  register: async (data: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    password: string
    termsAccepted: boolean
    marketingOptIn?: boolean
  }) => {
    try {
      const response = await api.post('/auth/register', data)
      return response.data
    } catch (error: any) {
      // Log detailed error for debugging
      console.error('Registration API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      })
      throw error
    }
  },

  login: async (email?: string, phone?: string, password: string = '') => {
    try {
      const response = await api.post('/auth/login', { email, phone, password })
      return response.data
    } catch (error: any) {
      console.error('Login API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      })
      throw error
    }
  },

  logout: async () => {
    const response = await api.post('/auth/logout')
    return response.data
  },

  getProfile: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  updateProfile: async (data: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    profilePicture?: string | null
    marketingOptIn?: boolean
  }) => {
    const response = await api.put('/auth/profile', data)
    return response.data
  },

  forgotPassword: async (email?: string, phone?: string) => {
    const response = await api.post('/auth/forgot-password', { email, phone })
    return response.data
  },

  resetPassword: async (resetToken: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', {
      resetToken,
      newPassword,
    })
    return response.data
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refreshToken })
    return response.data
  },
}

// Products API functions
export const productsAPI = {
  getAll: async (params?: {
    page?: number
    limit?: number
    category?: string
    search?: string
    featured?: boolean
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.category) queryParams.append('category', params.category)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.featured) queryParams.append('featured', 'true')

    const response = await api.get(`/products?${queryParams.toString()}`)
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/products/${id}`)
    return response.data
  },

  create: async (data: {
    title: string
    description?: string
    price: number
    discount?: number
    hsCode: string
    category?: string
    stock?: number
    images?: string[]
    featured?: boolean
    slug?: string
  }) => {
    const response = await api.post('/products', data)
    return response.data
  },

  update: async (id: string, data: {
    title?: string
    description?: string
    price?: number
    discount?: number
    hsCode?: string
    category?: string
    stock?: number
    images?: string[]
    featured?: boolean
    slug?: string
  }) => {
    const response = await api.put(`/products/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/products/${id}`)
    return response.data
  },
}

// Orders API functions
export const ordersAPI = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())

    const response = await api.get(`/orders?${queryParams.toString()}`)
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/orders/${id}`)
    return response.data
  },

  create: async (data: {
    userId?: string // Admin can specify userId
    items: Array<{ productId: string; quantity: number }>
    shippingAddress: {
      fullName: string
      address: string
      city: string
      zipCode: string
      country: string
      phone?: string
    }
    billingAddress: {
      fullName: string
      address: string
      city: string
      zipCode: string
      country: string
      phone?: string
    }
  }) => {
    const response = await api.post('/orders', data)
    return response.data
  },

  update: async (id: string, data: {
    status?: 'PENDING' | 'PROCESSED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
    trackingNumber?: string
    subOrderId?: string
  }) => {
    const response = await api.put(`/orders/${id}`, data)
    return response.data
  },
}

// Blog API functions
export const blogAPI = {
  getAll: async (params?: {
    page?: number
    limit?: number
    published?: boolean
    search?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.published !== undefined) queryParams.append('published', params.published.toString())
    if (params?.search) queryParams.append('search', params.search)

    const response = await api.get(`/blog?${queryParams.toString()}`)
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/blog/${id}`)
    return response.data
  },

  create: async (data: {
    title: string
    slug?: string
    excerpt?: string
    content: string
    featuredImage?: string | null
    published?: boolean
  }) => {
    const response = await api.post('/blog', data)
    return response.data
  },

  update: async (id: string, data: {
    title?: string
    slug?: string
    excerpt?: string | null
    content?: string
    featuredImage?: string | null
    published?: boolean
  }) => {
    const response = await api.put(`/blog/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/blog/${id}`)
    return response.data
  },
}

// Checkout API functions
export const checkoutAPI = {
  createSession: async (orderId: string) => {
    const response = await api.post('/checkout', { orderId })
    return response.data
  },
}

// Admin API functions
export const adminAPI = {
  getStats: async (params?: { startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)

    const response = await api.get(`/admin/stats?${queryParams.toString()}`)
    return response.data
  },

  getAllUsers: async (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())

    const response = await api.get(`/auth/admin/users?${queryParams.toString()}`)
    return response.data
  },
}

// Returns API functions
export const returnsAPI = {
  getAll: async (params?: { page?: number; limit?: number; status?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)

    const response = await api.get(`/returns/request?${queryParams.toString()}`)
    return response.data
  },

  create: async (data: {
    orderId: string
    reason: string
    images?: string[]
  }) => {
    const response = await api.post('/returns/request', data)
    return response.data
  },

  update: async (returnId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const response = await api.put('/returns/request', { returnId, status })
    return response.data
  },
}

// Projects API functions
export const projectsAPI = {
  getAll: async (params?: {
    page?: number
    limit?: number
    status?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)

    const response = await api.get(`/projects?${queryParams.toString()}`)
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/projects/${id}`)
    return response.data
  },

  create: async (data: {
    title: string
    description?: string
    client?: string
    year?: string
    status?: 'Completed' | 'In Progress'
    images?: string[]
    features?: string[]
  }) => {
    const response = await api.post('/projects', data)
    return response.data
  },

  update: async (id: string, data: {
    title?: string
    description?: string | null
    client?: string | null
    year?: string | null
    status?: 'Completed' | 'In Progress'
    images?: string[] | null
    features?: string[] | null
  }) => {
    const response = await api.put(`/projects/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/projects/${id}`)
    return response.data
  },
}

// Services API functions
export const servicesAPI = {
  getAll: async (params?: {
    page?: number
    limit?: number
    active?: boolean
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.active !== undefined) queryParams.append('active', params.active.toString())

    const response = await api.get(`/services?${queryParams.toString()}`)
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/services/${id}`)
    return response.data
  },

  create: async (data: {
    title: string
    description: string
    iconName?: string
    features?: string[]
    price?: string | null
    duration?: string | null
    active?: boolean
  }) => {
    const response = await api.post('/services', data)
    return response.data
  },

  update: async (id: string, data: {
    title?: string
    description?: string
    iconName?: string | null
    features?: string[] | null
    price?: string | null
    duration?: string | null
    active?: boolean
  }) => {
    const response = await api.put(`/services/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/services/${id}`)
    return response.data
  },
}

// Contact Messages API functions
export const contactAPI = {
  create: async (data: {
    name: string
    email: string
    subject?: string
    message: string
  }) => {
    const response = await api.post('/contact', data)
    return response.data
  },

  getAll: async (params?: {
    page?: number
    limit?: number
    archived?: boolean
    isRead?: boolean
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.archived !== undefined) queryParams.append('archived', params.archived.toString())
    if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString())

    const response = await api.get(`/contact?${queryParams.toString()}`)
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/contact/${id}`)
    return response.data
  },

  update: async (id: string, data: {
    isRead?: boolean
    archived?: boolean
  }) => {
    const response = await api.put(`/contact/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/contact/${id}`)
    return response.data
  },

  reply: async (id: string, data: {
    subject: string
    message: string
  }) => {
    const response = await api.post(`/contact/${id}/reply`, data)
    return response.data
  },
}

// User Messages API functions
export const messagesAPI = {
  getAll: async (params?: {
    page?: number
    limit?: number
    isRead?: boolean
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString())

    const response = await api.get(`/messages?${queryParams.toString()}`)
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/messages/${id}`)
    return response.data
  },

  create: async (data: {
    userId: string
    sender: string
    subject: string
    message: string
  }) => {
    const response = await api.post('/messages', data)
    return response.data
  },

  update: async (id: string, data: {
    isRead?: boolean
  }) => {
    const response = await api.put(`/messages/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/messages/${id}`)
    return response.data
  },
}

export default api
