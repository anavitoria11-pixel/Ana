export default function Card({ children, className = '', onClick }) {
  const clickableClasses = onClick
    ? 'cursor-pointer hover:shadow-sm transition-shadow'
    : ''

  return (
    <div
      onClick={onClick}
      className={`border border-[#E8E8E5] rounded-lg p-6 bg-white ${clickableClasses} ${className}`}
    >
      {children}
    </div>
  )
}
