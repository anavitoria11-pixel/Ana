import { useState, useEffect, useCallback } from 'react'

const typeStyles = {
  success: {
    borderColor: '#4DAB6D',
    icon: '✓',
    iconColor: '#4DAB6D',
  },
  error: {
    borderColor: '#EB5757',
    icon: '✕',
    iconColor: '#EB5757',
  },
  info: {
    borderColor: '#2EAADC',
    icon: 'ℹ',
    iconColor: '#2EAADC',
  },
}

export function Toast({ message, type = 'info', onDismiss }) {
  const styles = typeStyles[type] || typeStyles.info

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className="fixed top-5 right-5 z-50 flex items-start gap-3 bg-white border border-[#E8E8E5] rounded-lg shadow-md max-w-[360px] px-4 py-3 text-sm"
      style={{ borderLeftWidth: '4px', borderLeftColor: styles.borderColor }}
      role="alert"
    >
      <span
        className="font-semibold text-base leading-none mt-0.5"
        style={{ color: styles.iconColor }}
      >
        {styles.icon}
      </span>
      <p className="flex-1 text-[#191919] leading-relaxed">{message}</p>
      <button
        onClick={onDismiss}
        className="text-[#6B6B6B] hover:text-[#191919] transition-colors ml-1 leading-none text-lg"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  return { toast, showToast, hideToast }
}

export default Toast
