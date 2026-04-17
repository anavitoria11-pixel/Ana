import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: '/',
})

// Request interceptor: attach Authorization header if token exists
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: on 401, clear token and redirect to /login
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname
      const publicPaths = ['/login', '/signup', '/reset-password']
      const isPublicPath = publicPaths.some((path) => currentPath.startsWith(path))
      if (!isPublicPath) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API functions
export const auth = {
  signup: (data) => axiosInstance.post('/api/auth/signup', data).then((res) => res.data),
  login: (data) => axiosInstance.post('/api/auth/login', data).then((res) => res.data),
  me: () => axiosInstance.get('/api/auth/me').then((res) => res.data),
  getSecurityQuestion: (username) =>
    axiosInstance
      .post('/api/auth/reset-password/question', { username })
      .then((res) => res.data),
  resetPassword: (data) =>
    axiosInstance.post('/api/auth/reset-password/verify', data).then((res) => res.data),
}

// Quiz API functions
export const quiz = {
  createQuiz: (jobDescription) =>
    axiosInstance.post('/api/quizzes', { jobDescription }).then((res) => res.data),
  getQuizzes: () => axiosInstance.get('/api/quizzes').then((res) => res.data),
  getQuiz: (quizId) => axiosInstance.get(`/api/quizzes/${quizId}`).then((res) => res.data),
  submitQuiz: (quizId, answers) =>
    axiosInstance.post(`/api/quizzes/${quizId}/submit`, { answers }).then((res) => res.data),
}

export default axiosInstance
