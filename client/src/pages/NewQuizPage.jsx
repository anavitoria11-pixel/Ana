import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { quiz as quizApi } from '../services/api'
import { Toast, useToast } from '../components/common/Toast'
import TextArea from '../components/common/TextArea'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import PageContainer from '../components/layout/PageContainer'

const MIN_CHARS = 50
const MAX_CHARS = 15000

export default function NewQuizPage() {
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const charCount = jobDescription.length
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    try {
      const data = await quizApi.createQuiz(jobDescription)
      const quizId = data._id || data.id || data.quizId
      navigate(`/quiz/${quizId}`, { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to generate quiz. Please try again.'
      showToast(msg, 'error')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Generating your quiz..." />
      </div>
    )
  }

  return (
    <PageContainer>
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={hideToast} />
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#191919] mb-2">New Quiz</h1>
        <p className="text-sm text-[#6B6B6B]">
          Paste a job description below and we&apos;ll generate 5 questions to test your understanding.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <TextArea
          label="Job description"
          name="jobDescription"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here..."
          minLength={MIN_CHARS}
          maxLength={MAX_CHARS}
          rows={16}
        />

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-[#6B6B6B]">
            {charCount < MIN_CHARS && charCount > 0
              ? `${MIN_CHARS - charCount} more characters needed`
              : charCount === 0
              ? `Minimum ${MIN_CHARS} characters`
              : ''}
          </p>
          <Button
            type="submit"
            variant="primary"
            disabled={!isValid}
          >
            Generate Quiz
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
