import LoadingSpinner from './LoadingSpinner'

export default function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  onClick,
  children,
  type = 'button',
  className = '',
}) {
  const isDisabled = disabled || loading

  const baseClasses =
    'inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded transition-all focus:outline-none focus:ring-2 focus:ring-offset-1'

  const variantClasses =
    variant === 'primary'
      ? 'bg-[#191919] text-white hover:opacity-85 focus:ring-[#191919]'
      : 'bg-transparent border border-[#D4D4D0] text-[#191919] hover:bg-[#F7F7F5] focus:ring-[#D4D4D0]'

  const disabledClasses = isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses} ${disabledClasses} ${className}`}
    >
      {loading ? (
        <LoadingSpinner
          size="sm"
          color={variant === 'primary' ? 'white' : 'dark'}
        />
      ) : (
        children
      )}
    </button>
  )
}
