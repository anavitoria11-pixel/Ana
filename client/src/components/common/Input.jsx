export default function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={name}
          className="text-sm font-medium text-[#191919]"
        >
          {label}
          {required && <span className="text-[#EB5757] ml-0.5">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full h-10 px-3 py-2 text-sm border rounded bg-white text-[#191919] placeholder-[#6B6B6B] transition-colors focus:outline-none focus:border-[#2EAADC] ${
          error ? 'border-[#EB5757]' : 'border-[#E8E8E5]'
        }`}
      />
      {error && (
        <p className="text-[13px] text-[#EB5757]">{error}</p>
      )}
    </div>
  )
}
