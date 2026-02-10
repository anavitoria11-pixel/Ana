// Quiz data
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = [];

// DOM references
const menuEl = document.getElementById('menu');
const createModeEl = document.getElementById('create-mode');
const takeModeEl = document.getElementById('take-mode');
const btnTakeQuiz = document.getElementById('btn-take-quiz');
const quizStatus = document.getElementById('quiz-status');
const questionInput = document.getElementById('question-input');
const optionInputs = document.querySelectorAll('.option-input');
const questionsList = document.getElementById('questions-list');
const questionsUl = document.getElementById('questions-ul');

// --- Navigation ---

function showCreateMode() {
  menuEl.classList.add('hidden');
  createModeEl.classList.remove('hidden');
  takeModeEl.classList.add('hidden');
  questionInput.focus();
}

function showTakeMode() {
  if (questions.length === 0) return;
  menuEl.classList.add('hidden');
  createModeEl.classList.add('hidden');
  takeModeEl.classList.remove('hidden');
  startQuiz();
}

function backToMenu() {
  menuEl.classList.remove('hidden');
  createModeEl.classList.add('hidden');
  takeModeEl.classList.add('hidden');
  updateMenuStatus();
}

function finishCreating() {
  clearForm();
  backToMenu();
}

function updateMenuStatus() {
  const count = questions.length;
  if (count === 0) {
    quizStatus.textContent = 'No questions yet. Create a quiz first!';
    btnTakeQuiz.disabled = true;
  } else {
    quizStatus.textContent = `Quiz ready with ${count} question${count > 1 ? 's' : ''}.`;
    btnTakeQuiz.disabled = false;
  }
}

// --- Quiz Creation ---

function addQuestion() {
  const questionText = questionInput.value.trim();
  if (!questionText) {
    shakeElement(questionInput);
    return;
  }

  const options = [];
  let allFilled = true;
  optionInputs.forEach((input) => {
    const val = input.value.trim();
    if (!val) allFilled = false;
    options.push(val);
  });

  if (!allFilled) {
    optionInputs.forEach((input) => {
      if (!input.value.trim()) shakeElement(input);
    });
    return;
  }

  const correctIndex = parseInt(
    document.querySelector('input[name="correct"]:checked').value
  );

  questions.push({
    question: questionText,
    options: options,
    correctIndex: correctIndex,
  });

  renderQuestionsList();
  clearForm();
  questionInput.focus();
}

function removeQuestion(index) {
  questions.splice(index, 1);
  renderQuestionsList();
}

function renderQuestionsList() {
  if (questions.length === 0) {
    questionsList.classList.add('hidden');
    return;
  }

  questionsList.classList.remove('hidden');
  questionsUl.innerHTML = '';

  questions.forEach((q, i) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = `${i + 1}. ${q.question}`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => removeQuestion(i);

    li.appendChild(span);
    li.appendChild(removeBtn);
    questionsUl.appendChild(li);
  });
}

function clearForm() {
  questionInput.value = '';
  optionInputs.forEach((input) => (input.value = ''));
  document.querySelector('input[name="correct"][value="0"]').checked = true;
}

function shakeElement(el) {
  el.style.borderColor = '#f44336';
  el.style.animation = 'none';
  el.offsetHeight; // trigger reflow
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.animation = '';
  }, 600);
}

// --- Quiz Taking ---

function startQuiz() {
  currentQuestionIndex = 0;
  score = 0;
  userAnswers = [];

  document.getElementById('quiz-area').classList.remove('hidden');
  document.getElementById('results-area').classList.add('hidden');

  showQuestion();
}

function showQuestion() {
  const q = questions[currentQuestionIndex];
  const total = questions.length;

  // Update progress
  const progress = ((currentQuestionIndex) / total) * 100;
  document.getElementById('progress-fill').style.width = progress + '%';
  document.getElementById('question-counter').textContent =
    `Question ${currentQuestionIndex + 1} of ${total}`;
  document.getElementById('quiz-question').textContent = q.question;

  // Render options
  const optionsDiv = document.getElementById('quiz-options');
  optionsDiv.innerHTML = '';

  q.options.forEach((option, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = option;
    btn.onclick = () => selectAnswer(i);
    optionsDiv.appendChild(btn);
  });

  // Hide feedback and next button
  const feedback = document.getElementById('feedback');
  feedback.classList.add('hidden');
  feedback.className = 'hidden';
  document.getElementById('next-btn').classList.add('hidden');
}

function selectAnswer(selectedIndex) {
  const q = questions[currentQuestionIndex];
  const isCorrect = selectedIndex === q.correctIndex;
  const optionButtons = document.querySelectorAll('.quiz-option');

  // Disable all buttons
  optionButtons.forEach((btn) => (btn.disabled = true));

  // Highlight correct and wrong
  optionButtons[q.correctIndex].classList.add('correct');
  if (!isCorrect) {
    optionButtons[selectedIndex].classList.add('wrong');
  }

  // Show feedback
  const feedback = document.getElementById('feedback');
  feedback.classList.remove('hidden');
  if (isCorrect) {
    feedback.className = 'correct';
    feedback.textContent = 'Correct!';
    score++;
  } else {
    feedback.className = 'wrong';
    feedback.textContent = `Wrong! The correct answer was: ${q.options[q.correctIndex]}`;
  }

  userAnswers.push({
    question: q.question,
    selected: q.options[selectedIndex],
    correct: q.options[q.correctIndex],
    isCorrect: isCorrect,
  });

  // Show next button
  document.getElementById('next-btn').classList.remove('hidden');
  document.getElementById('next-btn').textContent =
    currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results';
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
    showQuestion();
  } else {
    showResults();
  }
}

function showResults() {
  document.getElementById('quiz-area').classList.add('hidden');
  document.getElementById('results-area').classList.remove('hidden');

  const percentage = Math.round((score / questions.length) * 100);

  document.getElementById('score-display').innerHTML = `
    <div class="score-number">${percentage}%</div>
    <div class="score-label">${score} out of ${questions.length} correct</div>
  `;

  const detailsEl = document.getElementById('results-details');
  detailsEl.innerHTML = '';

  userAnswers.forEach((a, i) => {
    const div = document.createElement('div');
    div.className = `result-item ${a.isCorrect ? 'correct' : 'wrong'}`;
    div.innerHTML = `
      <div class="result-question">${i + 1}. ${a.question}</div>
      <div class="result-answer">
        Your answer: ${a.selected}
        ${!a.isCorrect ? `<br>Correct answer: ${a.correct}` : ''}
      </div>
    `;
    detailsEl.appendChild(div);
  });
}

function retakeQuiz() {
  startQuiz();
}

// --- Allow Enter key to add questions ---
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !createModeEl.classList.contains('hidden')) {
    e.preventDefault();
    addQuestion();
  }
});

// --- Add shake animation ---
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    75% { transform: translateX(6px); }
  }
`;
document.head.appendChild(style);

// Initialize
updateMenuStatus();
