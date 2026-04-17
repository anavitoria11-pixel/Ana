import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth as authApi } from '../services/api'
import { Toast, useToast } from '../components/common/Toast'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import PageContainer from '../components/layout/PageContainer'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleStep1(e) {
    e.preventDefault()
    if (!username.trim()) {
      showToast('Please enter your username.', 'error')
      return
    }
    setLoading(true)
    try {
      const data = await authApi.getSecurityQuestion(username.trim())
      setSecurityQuestion(data.question || data.securityQuestion || '')
      setStep(2)
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Username not found.'
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleStep2(e) {
    e.preventDefault()
    if (!securityAnswer.trim() || !newPassword) {
      showToast('Please fill in all fields.', 'error')
      return
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'error')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword({
        username,
        securityAnswer: securityAnswer.trim(),
        newPassword,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Incorrect security answer.'
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
          <h1 className="text-2xl font-bold text-[#191919] mb-2">Reset password</h1>
          <p className="text-sm text-[#6B6B6B]">
            Remembered it?{' '}
            <Link to="/login" className="text-[#2EAADC] hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>

        {success ? (
          <div className="p-4 rounded-lg bg-[#F0FAF3] border border-[#4DAB6D]/40 text-sm text-[#191919]">
            <p className="font-medium text-[#4DAB6D] mb-1">Password reset!</p>
            <p className="text-[#6B6B6B]">Redirecting you to the login page...</p>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleStep1} className="flex flex-col gap-4" noValidate>
            <p className="text-sm text-[#6B6B6B]">
              Enter your username and we&apos;ll show you your security question.
            </p>
            <Input
              label="Username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-username"
              required
            />
            <Button type="submit" variant="primary" loading={loading} className="w-full">
              Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={handleStep2} className="flex flex-col gap-4" noValidate>
            {/* Show the retrieved security question */}
            <div className="p-3 rounded-lg bg-[#F7F7F5] border border-[#E8E8E5]">
              <p className="text-xs font-medium text-[#6B6B6B] mb-1">Security question</p>
              <p className="text-sm text-[#191919]">{securityQuestion}</p>
            </div>

            <Input
              label="Your answer"
              name="securityAnswer"
              type="text"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder="Your answer"
              required
            />
            <Input
              label="New password"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="at least 6 characters"
              required
            />

            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" variant="primary" loading={loading} className="flex-1">
                Reset password
              </Button>
            </div>
          </form>
        )}
      </div>
    </PageContainer>
  )
}
