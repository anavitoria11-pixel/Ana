export default function TextArea({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  maxLength,
  minLength,
  rows = 12,
}) {
  const currentLength = value ? value.length : 0
  const isOverMax = maxLength && currentLength > maxLength
  const isBelowMin = minLength && currentLength < minLength && currentLength > 0

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={name}
          className="text-sm font-medium text-[#191919]"
        >
          {label}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 text-sm border rounded bg-white text-[#191919] placeholder-[#6B6B6B] transition-colors focus:outline-none focus:border-[#2EAADC] resize-y leading-relaxed ${
          error || isOverMax ? 'border-[#EB5757]' : 'border-[#E8E8E5]'
        }`}
      />
      <div className="flex items-center justify-between gap-2">
        <div>
          {error && <p className="text-[13px] text-[#EB5757]">{error}</p>}
          {!error && minLength && isBelowMin && (
            <p className="text-[13px] text-[#6B6B6B]">
              Minimum {minLength} characters
            </p>
          )}
        </div>
        {maxLength && (
          <p
            className={`text-[13px] ml-auto whitespace-nowrap ${
              isOverMax ? 'text-[#EB5757]' : 'text-[#6B6B6B]'
            }`}
          >
            {currentLength.toLocaleString()} / {maxLength.toLocaleString()} characters
          </p>
        )}
      </div>
    </div>
  )
}
