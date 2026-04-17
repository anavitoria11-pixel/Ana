import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { auth as authApi } from '../services/api'
import { Toast, useToast } from '../components/common/Toast'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import PageContainer from '../components/layout/PageContainer'

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What was the make of your first car?",
  "What is the name of your favorite childhood friend?",
]

export default function SignupPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  const [form, setForm] = useState({
    username: '',
    password: '',
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: '',
  })
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username.trim() || !form.password || !form.securityAnswer.trim()) {
      showToast('Please fill in all fields.', 'error')
      return
    }
    if (form.password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error')
      return
    }
    setLoading(true)
    try {
      const data = await authApi.signup(form)
      login(data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to create account. Please try again.'
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
          <h1 className="text-2xl font-bold text-[#191919] mb-2">Create an account</h1>
          <p className="text-sm text-[#6B6B6B]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#2EAADC] hover:underline font-medium">
              Log in
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
            placeholder="choose-a-username"
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="at least 6 characters"
            required
          />

          {/* Security question */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="securityQuestion"
              className="text-sm font-medium text-[#191919]"
            >
              Security question <span className="text-[#EB5757]">*</span>
            </label>
            <select
              id="securityQuestion"
              name="securityQuestion"
              value={form.securityQuestion}
              onChange={handleChange}
              className="w-full h-10 px-3 py-2 text-sm border border-[#E8E8E5] rounded bg-white text-[#191919] focus:outline-none focus:border-[#2EAADC] transition-colors"
            >
              {SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Security answer"
            name="securityAnswer"
            type="text"
            value={form.securityAnswer}
            onChange={handleChange}
            placeholder="Your answer"
            required
          />

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
            Create account
          </Button>
        </form>
      </div>
    </PageContainer>
  )
}
