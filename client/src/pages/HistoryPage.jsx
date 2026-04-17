import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { quiz as quizApi } from '../services/api'
import { formatDate, truncate } from '../utils/helpers'
import PageContainer from '../components/layout/PageContainer'
import Card from '../components/common/Card'
import ScoreBadge from '../components/common/ScoreBadge'
import EmptyState from '../components/common/EmptyState'

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <div className="border border-[#E8E8E5] rounded-lg p-6 bg-white animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-4 bg-[#F1F1EF] rounded w-3/4" />
          <div className="h-3 bg-[#F1F1EF] rounded w-1/3" />
        </div>
        <div className="h-6 w-12 bg-[#F1F1EF] rounded-full" />
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    quizApi
      .getQuizzes()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.quizzes || []
        setQuizzes(list)
      })
      .catch(() => setError('Failed to load quiz history.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#191919] mb-1">History</h1>
        <p className="text-sm text-[#6B6B6B]">All your past quizzes in one place.</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((n) => (
            <SkeletonCard key={n} />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-[#EB5757] text-center py-16">{error}</p>
      ) : quizzes.length === 0 ? (
        <EmptyState
          message="No quizzes yet. Start by creating a new quiz!"
          action={{
            label: 'New Quiz',
            onClick: () => navigate('/quiz/new'),
          }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {quizzes.map((quiz) => {
            const quizId = quiz._id || quiz.id
            const hasResult = quiz.score !== null && quiz.score !== undefined
            const target = `/history/${quizId}`

            return (
              <Card key={quizId} onClick={() => navigate(target)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-sm font-medium text-[#191919] leading-snug">
                      {truncate(quiz.jobTitle || quiz.title || 'Untitled Quiz', 90)}
                    </p>
                    <p className="text-xs text-[#6B6B6B]">
                      {formatDate(quiz.createdAt || quiz.date)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {hasResult ? (
                      <ScoreBadge
                        score={quiz.score}
                        total={quiz.totalQuestions || quiz.total || 5}
                      />
                    ) : (
                      <span className="text-xs text-[#6B6B6B] bg-[#F7F7F5] border border-[#E8E8E5] px-2 py-1 rounded-full whitespace-nowrap">
                        Not submitted
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </PageContainer>
  )
}
