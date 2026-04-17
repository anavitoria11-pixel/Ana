import OptionButton from './OptionButton'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  showResults,
  questionNumber,
}) {
  const { questionText, options, correctAnswer, explanation, wrongExplanations } = question

  return (
    <div className="border border-[#E8E8E5] rounded-lg p-6 bg-white flex flex-col gap-4">
      {/* Question number + text */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">
          Question {questionNumber}
        </span>
        <p className="text-[#191919] text-base font-medium leading-relaxed">
          {questionText}
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {options.map((option, index) => {
          const label = option.label || OPTION_LABELS[index]
          const optionText = option.text || option
          const isSelected = selectedAnswer === label
          const isCorrect = showResults && label === correctAnswer
          const isIncorrect = showResults && isSelected && label !== correctAnswer

          return (
            <OptionButton
              key={label}
              label={label}
              text={optionText}
              selected={!showResults && isSelected}
              correct={isCorrect}
              incorrect={isIncorrect}
              disabled={showResults || (!!selectedAnswer && !isSelected)}
              onClick={() => onSelectAnswer && onSelectAnswer(label)}
            />
          )
        })}
      </div>

      {/* Explanation block (shown after results) */}
      {showResults && (
        <div className="mt-2 flex flex-col gap-3 border-t border-[#E8E8E5] pt-4">
          {/* Correct answer explanation */}
          <div className="flex gap-3 p-3 rounded-lg bg-[#F0FAF3] border border-[#4DAB6D]/30">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#4DAB6D] text-white text-xs flex items-center justify-center font-bold mt-0.5">
              ✓
            </span>
            <div>
              <p className="text-xs font-semibold text-[#4DAB6D] mb-1">
                Correct Answer: {correctAnswer}
              </p>
              <p className="text-sm text-[#191919] leading-relaxed">{explanation}</p>
            </div>
          </div>

          {/* Wrong answer explanation (only if user was wrong) */}
          {selectedAnswer && selectedAnswer !== correctAnswer && wrongExplanations && wrongExplanations[selectedAnswer] && (
            <div className="flex gap-3 p-3 rounded-lg bg-[#FEF2F2] border border-[#EB5757]/30">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#EB5757] text-white text-xs flex items-center justify-center font-bold mt-0.5">
                ✕
              </span>
              <div>
                <p className="text-xs font-semibold text-[#EB5757] mb-1">
                  Why {selectedAnswer} is incorrect
                </p>
                <p className="text-sm text-[#191919] leading-relaxed">
                  {wrongExplanations[selectedAnswer]}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
