import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { quiz as quizApi } from '../services/api'
import { formatDate } from '../utils/helpers'
import QuestionCard from '../components/quiz/QuestionCard'
import ScoreBadge from '../components/common/ScoreBadge'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import PageContainer from '../components/layout/PageContainer'

export default function ResultsPage() {
  const { quizId } = useParams()
  const [quizData, setQuizData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    quizApi
      .getQuiz(quizId)
      .then((data) => setQuizData(data))
      .catch(() => setError('Failed to load results.'))
      .finally(() => setLoading(false))
  }, [quizId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (error || !quizData) {
    return (
      <PageContainer>
        <p className="text-sm text-[#EB5757] text-center py-16">{error || 'Quiz not found.'}</p>
      </PageContainer>
    )
  }

  const result = quizData.result || {}
  const questions = quizData.questions || []
  const score = result.score ?? 0
  const total = result.totalQuestions ?? questions.length
  const scorePercent = total > 0 ? Math.round((score / total) * 100) : 0
  const learningSummary = quizData.learningSummary || ''

  // Build lookup: questionId -> selectedAnswer from result
  const answerByQuestionId = {}
  if (Array.isArray(result.answers)) {
    result.answers.forEach((a) => {
      answerByQuestionId[a.questionId] = a.selectedAnswer
    })
  }

  return (
    <PageContainer>
      <div className="mb-10 p-6 border border-[#E8E8E5] rounded-lg bg-[#F7F7F5] flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-2">
              Quiz Results
            </p>
            <h1 className="text-xl font-bold text-[#191919] mb-1">
              {quizData.jobTitle || 'Quiz'}
            </h1>
            {quizData.createdAt && (
              <p className="text-xs text-[#6B6B6B]">{formatDate(quizData.createdAt)}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <ScoreBadge score={score} total={total} />
            <p className="text-xs text-[#6B6B6B]">{scorePercent}%</p>
          </div>
        </div>
        <p className="text-sm text-[#191919]">
          {score === total
            ? 'Perfect score! You have an excellent understanding of this role.'
            : score >= total / 2
            ? 'Good job! Review the explanations below to strengthen your understanding.'
            : 'Keep studying! Go through the explanations to learn more about this role.'}
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-10">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.questionId}
            question={question}
            questionNumber={index + 1}
            selectedAnswer={answerByQuestionId[question.questionId] || null}
            showResults={true}
          />
        ))}
      </div>

      {learningSummary && (
        <div className="mb-10 p-5 border border-[#E8E8E5] rounded-lg bg-white">
          <h2 className="text-sm font-semibold text-[#191919] mb-3">Learning Summary</h2>
          <p className="text-sm text-[#6B6B6B] leading-relaxed">{learningSummary}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-[#E8E8E5] pt-6">
        <Link
          to="/history"
          className="text-sm text-[#6B6B6B] hover:text-[#191919] hover:underline"
        >
          ← Back to History
        </Link>
        <Link to="/quiz/new">
          <Button variant="primary">Take Another Quiz</Button>
        </Link>
      </div>
    </PageContainer>
  )
}
