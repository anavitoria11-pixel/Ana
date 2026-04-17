import { getScoreColor } from '../../utils/helpers'

const colorMap = {
  correct: {
    bg: '#F0FAF3',
    text: '#4DAB6D',
    border: '#4DAB6D',
  },
  accent: {
    bg: '#EFF8FD',
    text: '#2EAADC',
    border: '#2EAADC',
  },
  incorrect: {
    bg: '#FEF2F2',
    text: '#EB5757',
    border: '#EB5757',
  },
}

export default function ScoreBadge({ score, total }) {
  const colorKey = getScoreColor(score, total)
  const colors = colorMap[colorKey]

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      {score}/{total}
    </span>
  )
}
