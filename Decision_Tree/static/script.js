/**
 * Student Placement Prediction - Frontend Controller (60-30-10 Architecture)
 * Handles Theme Toggling (with localStorage), Precision Stepper (+ / -) Control,
 * Profile Presets, and Async Form Submission to FastAPI /predict
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSliders();
  initForm();
  loadPreset('star'); // Default to high-achiever preset on initial load
});

/* ==========================================================================
   1. Theme Management (Light / Dark Mode with localStorage)
   ========================================================================== */
function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('placement_app_theme') || 'dark';

  setTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
      localStorage.setItem('placement_app_theme', nextTheme);
    });
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!toggleBtn) return;

  if (theme === 'dark') {
    toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i> <span>Light Mode</span>';
    toggleBtn.setAttribute('title', 'Switch to Light Mode');
  } else {
    toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i> <span>Dark Mode</span>';
    toggleBtn.setAttribute('title', 'Switch to Dark Mode');
  }
}

/* ==========================================================================
   2. Slider & Stepper (+ / -) Real-time Value Sync
   ========================================================================== */
const sliderConfigs = [
  { id: 'study_hours', suffix: ' hrs', step: 0.5, min: 0, max: 14 },
  { id: 'sleep_hours', suffix: ' hrs', step: 0.5, min: 3, max: 12 },
  { id: 'internet_usage', suffix: ' hrs', step: 0.5, min: 0, max: 14 },
  { id: 'attendance', suffix: '%', step: 1, min: 0, max: 100 },
  { id: 'assignments_completed', suffix: '', step: 1, min: 0, max: 20 },
  { id: 'previous_score', suffix: '%', step: 0.5, min: 0, max: 100 },
  { id: 'exam_score', suffix: '%', step: 0.5, min: 0, max: 100 }
];

function initSliders() {
  sliderConfigs.forEach(cfg => {
    const slider = document.getElementById(cfg.id);
    const badge = document.getElementById(cfg.id + '_badge');
    if (slider && badge) {
      slider.addEventListener('input', (e) => {
        badge.textContent = e.target.value + cfg.suffix;
      });
    }
  });
}

function updateSliderBadge(id, value, suffix) {
  const badge = document.getElementById(id + '_badge');
  if (badge) {
    badge.textContent = value + suffix;
  }
}

/**
 * Increment or decrement slider values when clicking + or - buttons
 */
function stepValue(id, delta) {
  const cfg = sliderConfigs.find(item => item.id === id);
  const slider = document.getElementById(id);
  if (!cfg || !slider) return;

  let currentVal = parseFloat(slider.value) || 0;
  let newVal = currentVal + delta;

  // Clamp within boundaries
  if (newVal < cfg.min) newVal = cfg.min;
  if (newVal > cfg.max) newVal = cfg.max;

  // Round to 1 decimal place
  newVal = Math.round(newVal * 10) / 10;

  slider.value = newVal;
  updateSliderBadge(id, newVal, cfg.suffix);
}

/* ==========================================================================
   3. Student Profile Presets
   ========================================================================== */
const presets = {
  star: {
    gender: 'Male',
    branch: 'CSE',
    extracurricular: 'Yes',
    study_hours: 8.5,
    sleep_hours: 7.5,
    internet_usage: 2.0,
    attendance: 92,
    assignments_completed: 14,
    previous_score: 88,
    exam_score: 91
  },
  average: {
    gender: 'Female',
    branch: 'IT',
    extracurricular: 'Yes',
    study_hours: 5.5,
    sleep_hours: 6.5,
    internet_usage: 4.0,
    attendance: 78,
    assignments_completed: 8,
    previous_score: 68,
    exam_score: 70
  },
  risk: {
    gender: 'Male',
    branch: 'CIVIL',
    extracurricular: 'No',
    study_hours: 2.0,
    sleep_hours: 5.0,
    internet_usage: 7.0,
    attendance: 52,
    assignments_completed: 2,
    previous_score: 42,
    exam_score: 45
  }
};

function loadPreset(type) {
  const p = presets[type];
  if (!p) return;

  document.getElementById('gender').value = p.gender;
  document.getElementById('branch').value = p.branch;
  document.getElementById('extracurricular').value = p.extracurricular;

  sliderConfigs.forEach(cfg => {
    const slider = document.getElementById(cfg.id);
    if (slider && p[cfg.id] !== undefined) {
      slider.value = p[cfg.id];
      updateSliderBadge(cfg.id, p[cfg.id], cfg.suffix);
    }
  });

  // Automatically submit and forecast
  submitPrediction();
}

function resetForm() {
  loadPreset('average');
  showState('empty');
}

/* ==========================================================================
   4. Form Submission & FastAPI /predict Integration
   ========================================================================== */
function initForm() {
  const form = document.getElementById('predictionForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitPrediction();
    });
  }
}

async function submitPrediction() {
  // Extract the 10 required features
  const payload = {
    gender: document.getElementById('gender').value,
    branch: document.getElementById('branch').value,
    study_hours: parseFloat(document.getElementById('study_hours').value),
    attendance: parseFloat(document.getElementById('attendance').value),
    sleep_hours: parseFloat(document.getElementById('sleep_hours').value),
    internet_usage: parseFloat(document.getElementById('internet_usage').value),
    assignments_completed: parseInt(document.getElementById('assignments_completed').value, 10),
    previous_score: parseFloat(document.getElementById('previous_score').value),
    extracurricular: document.getElementById('extracurricular').value,
    exam_score: parseFloat(document.getElementById('exam_score').value)
  };

  showState('loading');
  hideError();

  try {
    const response = await fetch('/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status} (${response.statusText})`);
    }

    const data = await response.json();
    renderResult(data, payload);
    showState('result');
  } catch (error) {
    console.error('Prediction error:', error);
    showError(`Failed to evaluate model: ${error.message}`);
    showState('empty');
  }
}

/* ==========================================================================
   5. Render Outcome & Insights
   ========================================================================== */
function renderResult(data, input) {
  const isPlaced = data.placement_prediction === 'Placed';
  const prob = data.probability_placed !== undefined 
    ? data.probability_placed 
    : (isPlaced ? 92.5 : 18.0);

  const banner = document.getElementById('outcomeBanner');
  const icon = document.getElementById('outcomeIcon');
  const title = document.getElementById('outcomeTitle');
  const pill = document.getElementById('outcomePill');
  const desc = document.getElementById('outcomeDesc');
  const probVal = document.getElementById('probabilityValue');
  const probFill = document.getElementById('probabilityFill');

  // Update classes
  banner.className = 'outcome-status-card ' + (isPlaced ? 'placed' : 'not-placed');
  probFill.className = 'meter-bar ' + (isPlaced ? 'placed' : 'not-placed');

  if (isPlaced) {
    icon.innerHTML = '<i class="fa-solid fa-check"></i>';
    title.textContent = 'Placed';
    pill.textContent = 'High Potential Forecast';
    desc.textContent = 'Candidate demonstrates strong academic scores and healthy habit metrics meeting placement cutoffs.';
  } else {
    icon.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    title.textContent = 'Not Placed';
    pill.textContent = 'Intervention Advised';
    desc.textContent = 'Key indicators suggest extra mentoring, mock interviews, and skill building are recommended.';
  }

  probVal.textContent = prob.toFixed(1) + '%';
  probFill.style.width = Math.min(100, Math.max(0, prob)) + '%';

  // Build Key Feedback Insights
  const insightsList = document.getElementById('insightsList');
  insightsList.innerHTML = '';
  const insights = [];

  if (input.attendance < 75) {
    insights.push(`<strong>Attendance (${input.attendance}%)</strong> is below the recommended 75% eligibility cutoff.`);
  } else {
    insights.push(`<strong>Strong Attendance (${input.attendance}%)</strong> supports eligibility across campus drives.`);
  }

  if (input.study_hours < 4.0) {
    insights.push(`<strong>Daily Study (${input.study_hours}h/day)</strong> could be improved to 5–6 hours for technical rounds.`);
  } else {
    insights.push(`<strong>Solid Daily Routine (${input.study_hours}h/day)</strong> shows consistent technical preparation.`);
  }

  if (input.exam_score >= 80) {
    insights.push(`<strong>High Final Exam Score (${input.exam_score}%)</strong> provides a clear competitive edge.`);
  } else if (input.exam_score < 60) {
    insights.push(`<strong>Final Score (${input.exam_score}%)</strong> may trigger initial shortlist screening flags.`);
  }

  if (input.extracurricular === 'Yes') {
    insights.push(`<strong>Extracurricular engagement</strong> demonstrates communication and leadership ability.`);
  }

  insights.forEach(text => {
    const li = document.createElement('li');
    li.innerHTML = text;
    insightsList.appendChild(li);
  });
}

/* ==========================================================================
   6. UI State Helpers
   ========================================================================== */
function showState(state) {
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  const resultDisplay = document.getElementById('resultDisplay');
  const submitBtn = document.getElementById('submitBtn');

  emptyState.classList.add('hidden');
  loadingState.classList.add('hidden');
  resultDisplay.classList.add('hidden');

  if (state === 'empty') {
    emptyState.classList.remove('hidden');
  } else if (state === 'loading') {
    loadingState.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = true;
  } else if (state === 'result') {
    resultDisplay.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = false;
  }

  if (state !== 'loading' && submitBtn) {
    submitBtn.disabled = false;
  }
}

function showError(msg) {
  const errorBox = document.getElementById('errorBanner');
  const errorMsg = document.getElementById('errorMessage');
  if (errorBox && errorMsg) {
    errorMsg.textContent = msg;
    errorBox.classList.remove('hidden');
  }
}

function hideError() {
  const errorBox = document.getElementById('errorBanner');
  if (errorBox) {
    errorBox.classList.add('hidden');
  }
}
