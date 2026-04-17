import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { quiz as quizApi } from '../services/api'
import { formatDate, truncate } from '../utils/helpers'
import PageContainer from '../components/layout/PageContainer'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import ScoreBadge from '../components/common/ScoreBadge'
import EmptyState from '../components/common/EmptyState'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function DashboardPage() {
  const { user } = useAuth()
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
      .catch(() => setError('Failed to load quizzes.'))
      .finally(() => setLoading(false))
  }, [])

  const recentQuizzes = quizzes.slice(0, 3)
  const username = user?.username || user?.name || 'there'

  return (
    <PageContainer>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-[#191919] mb-1">
            Welcome back, {username}
          </h1>
          <p className="text-sm text-[#6B6B6B]">
            Ready to test your knowledge of a new role?
          </p>
        </div>
        <Link to="/quiz/new">
          <Button variant="primary">New Quiz</Button>
        </Link>
      </div>

      {/* Recent quizzes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#191919]">Recent quizzes</h2>
          {quizzes.length > 3 && (
            <Link
              to="/history"
              className="text-sm text-[#2EAADC] hover:underline"
            >
              View all
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="md" />
          </div>
        ) : error ? (
          <p className="text-sm text-[#EB5757] py-8 text-center">{error}</p>
        ) : recentQuizzes.length === 0 ? (
          <EmptyState
            message="No quizzes yet. Create one to get started!"
            action={{
              label: 'New Quiz',
              onClick: () => navigate('/quiz/new'),
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {recentQuizzes.map((quiz) => {
              const hasResult = quiz.score !== null && quiz.score !== undefined
              const target = hasResult
                ? `/quiz/${quiz._id || quiz.id}/results`
                : `/quiz/${quiz._id || quiz.id}`

              return (
                <Card
                  key={quiz._id || quiz.id}
                  onClick={() => navigate(target)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-sm font-medium text-[#191919] leading-snug">
                        {truncate(quiz.jobTitle || quiz.title || 'Untitled Quiz', 80)}
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
                        <span className="text-xs text-[#6B6B6B] bg-[#F7F7F5] border border-[#E8E8E5] px-2 py-1 rounded-full">
                          In progress
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </PageContainer>
  )
}
