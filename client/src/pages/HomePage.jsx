import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import Button from '../components/common/Button'
import PageContainer from '../components/layout/PageContainer'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  return (
    <PageContainer>
      <div className="flex flex-col items-center text-center gap-8 py-16">
        {/* Badge */}
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#F7F7F5] border border-[#E8E8E5] text-[#6B6B6B]">
          AI-powered job prep
        </span>

        {/* Headline */}
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold text-[#191919] leading-tight tracking-tight">
            JD Quiz
          </h1>
          <p className="text-lg text-[#6B6B6B] max-w-md leading-relaxed">
            Test your understanding of any job description. Paste a JD, get 5 targeted questions, and see how well you know the role.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link to="/signup">
            <Button variant="primary">
              Get started — it&apos;s free
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">
              Log in
            </Button>
          </Link>
        </div>

        {/* Feature hints */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 w-full max-w-lg text-left">
          {[
            {
              title: 'Paste any JD',
              desc: 'Works with job descriptions from any industry or format.',
            },
            {
              title: '5 smart questions',
              desc: 'AI generates questions that test real comprehension of the role.',
            },
            {
              title: 'Instant feedback',
              desc: 'See explanations for every answer to learn as you go.',
            },
          ].map((feat) => (
            <div key={feat.title} className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-[#191919]">{feat.title}</p>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
