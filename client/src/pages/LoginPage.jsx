import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { auth as authApi } from '../services/api'
import { Toast, useToast } from '../components/common/Toast'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import PageContainer from '../components/layout/PageContainer'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      showToast('Please fill in all fields.', 'error')
      return
    }
    setLoading(true)
    try {
      const data = await authApi.login(form)
      login(data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Invalid username or password.'
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer>
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={hideToast} />
      )}

      <div className="max-w-sm mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#191919] mb-2">Welcome back</h1>
          <p className="text-sm text-[#6B6B6B]">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-[#2EAADC] hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Username"
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            placeholder="your-username"
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />

          <div className="flex items-center justify-between mt-1">
            <Link
              to="/reset-password"
              className="text-sm text-[#6B6B6B] hover:text-[#191919] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
            Log in
          </Button>
        </form>
      </div>
    </PageContainer>
  )
}
