export default function LoadingSpinner({ size = 'md', message, color = 'dark' }) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  }

  const colorMap = {
    dark: 'border-[#E8E8E5] border-t-[#191919]',
    white: 'border-white/30 border-t-white',
    accent: 'border-[#E8E8E5] border-t-[#2EAADC]',
  }

  const spinnerClasses = `${sizeMap[size] || sizeMap.md} ${colorMap[color] || colorMap.dark} rounded-full animate-spin`

  if (message) {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className={spinnerClasses} />
        <p className="text-sm text-[#6B6B6B]">{message}</p>
      </div>
    )
  }

  return <div className={spinnerClasses} />
}
