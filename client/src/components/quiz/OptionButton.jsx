export default function OptionButton({
  label,
  text,
  selected,
  correct,
  incorrect,
  disabled,
  onClick,
}) {
  let containerClasses =
    'w-full text-left flex items-start gap-3 px-4 py-3 border rounded-lg transition-all text-sm'

  let labelClasses =
    'flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-semibold'

  if (correct) {
    containerClasses += ' border-[#E8E8E5] border-l-4 border-l-[#4DAB6D] bg-[#F0FAF3] cursor-default'
    labelClasses += ' bg-[#4DAB6D] text-white'
  } else if (incorrect) {
    containerClasses += ' border-[#E8E8E5] border-l-4 border-l-[#EB5757] bg-[#FEF2F2] cursor-default'
    labelClasses += ' bg-[#EB5757] text-white'
  } else if (selected) {
    containerClasses += ' border-[#191919] bg-[#F7F7F5] cursor-pointer'
    labelClasses += ' bg-[#191919] text-white'
  } else if (disabled) {
    containerClasses += ' border-[#E8E8E5] bg-white cursor-default opacity-60'
    labelClasses += ' bg-[#E8E8E5] text-[#6B6B6B]'
  } else {
    containerClasses += ' border-[#E8E8E5] bg-white cursor-pointer hover:bg-[#F7F7F5] hover:border-[#D4D4D0]'
    labelClasses += ' bg-[#F7F7F5] text-[#191919]'
  }

  return (
    <button
      type="button"
      onClick={!disabled ? onClick : undefined}
      disabled={disabled && !correct && !incorrect}
      className={containerClasses}
    >
      <span className={labelClasses}>{label}</span>
      <span className="flex-1 leading-relaxed text-[#191919]">{text}</span>
    </button>
  )
}
