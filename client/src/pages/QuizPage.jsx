import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { quiz as quizApi } from '../services/api'
import { Toast, useToast } from '../components/common/Toast'
import QuestionCard from '../components/quiz/QuestionCard'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import PageContainer from '../components/layout/PageContainer'

export default function QuizPage() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  const [quizData, setQuizData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  // answers keyed by questionId: { q1: 'A', q2: 'C', ... }
  const [answers, setAnswers] = useState({})

  useEffect(() => {
    quizApi
      .getQuiz(quizId)
      .then((data) => {
        if (data.result) {
          navigate(`/quiz/${quizId}/results`, { replace: true })
          return
        }
        setQuizData(data)
      })
      .catch(() => showToast('Failed to load quiz.', 'error'))
      .finally(() => setLoading(false))
  }, [quizId, navigate, showToast])

  function handleSelectAnswer(questionId, label) {
    setAnswers((prev) => ({ ...prev, [questionId]: label }))
  }

  const questions = quizData?.questions || []
  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === questions.length && questions.length > 0

  async function handleSubmit() {
    if (!allAnswered) return
    setSubmitting(true)
    try {
      const answersArray = questions.map((q) => ({
        questionId: q.questionId,
        selectedAnswer: answers[q.questionId],
      }))
      await quizApi.submitQuiz(quizId, answersArray)
      navigate(`/quiz/${quizId}/results`, { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        'Failed to submit quiz. Your answers are saved — please try again.'
      showToast(msg, 'error')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (!quizData) {
    return (
      <PageContainer>
        <p className="text-sm text-[#EB5757] text-center py-16">Quiz not found.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={hideToast} />
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#191919] mb-1">
          {quizData.jobTitle || 'Quiz'}
        </h1>
        <p className="text-sm text-[#6B6B6B]">
          Answer all {questions.length} questions, then submit.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-[#E8E8E5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2EAADC] rounded-full transition-all duration-300"
            style={{ width: questions.length > 0 ? `${(answeredCount / questions.length) * 100}%` : '0%' }}
          />
        </div>
        <span className="text-xs text-[#6B6B6B] whitespace-nowrap">
          {answeredCount} / {questions.length} answered
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.questionId}
            question={question}
            questionNumber={index + 1}
            selectedAnswer={answers[question.questionId] || null}
            onSelectAnswer={(label) => handleSelectAnswer(question.questionId, label)}
            showResults={false}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#E8E8E5] pt-6">
        <p className="text-sm text-[#6B6B6B]">
          {!allAnswered
            ? `${questions.length - answeredCount} question${questions.length - answeredCount !== 1 ? 's' : ''} remaining`
            : 'All questions answered!'}
        </p>
        <Button
          variant="primary"
          disabled={!allAnswered}
          loading={submitting}
          onClick={handleSubmit}
        >
          Submit Quiz
        </Button>
      </div>
    </PageContainer>
  )
}
