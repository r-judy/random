/**
 * 스마트 발표자 추첨기 (Smart Speaker Picker)
 * 사용자가 제공한 Python 핵심 로직을 브라우저 환경에 맞추어 구현한 스크립트
 */

// ==========================================
// 1. 애플리케이션 상태 (State)
// ==========================================
const state = {
  mode: 'number', // 'number' | 'name'
  totalCount: 30,
  speakerCount: 3,
  excludedNumbers: new Set(),
  customNames: [],
  autoExclude: true,
  sortResult: true,
  soundEnabled: true,
  isRolling: false,
  lastWinners: [],
  history: []
};

// ==========================================
// 2. DOM 요소 참조
// ==========================================
const elements = {
  // 모드 전환
  tabNumber: document.getElementById('tab-mode-number'),
  tabName: document.getElementById('tab-mode-name'),
  panelNumber: document.getElementById('number-mode-panel'),
  panelName: document.getElementById('name-mode-panel'),

  // 입력 필드들
  totalInput: document.getElementById('total-count-input'),
  excludeInput: document.getElementById('exclude-input'),
  excludeChipsContainer: document.getElementById('exclude-chips-container'),
  namesInput: document.getElementById('names-input'),
  speakerInput: document.getElementById('speaker-count-input'),
  candidateBadge: document.getElementById('candidate-count-badge'),

  // 버튼들
  speakerMinusBtn: document.getElementById('btn-speaker-minus'),
  speakerPlusBtn: document.getElementById('btn-speaker-plus'),
  presetBtns: document.querySelectorAll('.preset-btn'),
  drawBtn: document.getElementById('draw-btn'),
  copyResultBtn: document.getElementById('copy-result-btn'),
  clearExcludeBtn: document.getElementById('clear-exclude-btn'),
  soundToggleBtn: document.getElementById('sound-toggle-btn'),
  soundIcon: document.getElementById('sound-icon'),
  soundLabel: document.getElementById('sound-label'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),

  // 체크박스들
  autoExcludeChk: document.getElementById('auto-exclude-chk'),
  sortResultChk: document.getElementById('sort-result-chk'),

  // 스테이지 및 결과
  emptyState: document.getElementById('empty-state'),
  rollingStatus: document.getElementById('rolling-status'),
  winnerGrid: document.getElementById('winner-cards-grid'),
  historyList: document.getElementById('history-list'),

  // 캔버스 및 토스트
  confettiCanvas: document.getElementById('confetti-canvas'),
  toast: document.getElementById('toast'),
  toastText: document.getElementById('toast-text'),
  toastIcon: document.getElementById('toast-icon')
};

// ==========================================
// 3. Web Audio API (합성 사운드 엔진 - 무설치 오프라인 작동)
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTick() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + Math.random() * 80, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {
      // Audio error fallback
    }
  }

  playFanfare() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.15 }, // C5
      { freq: 659.25, time: 0.15, dur: 0.15 }, // E5
      { freq: 783.99, time: 0.30, dur: 0.20 }, // G5
      { freq: 1046.50, time: 0.50, dur: 0.45 }  // C6
    ];

    notes.forEach(n => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, this.ctx.currentTime + n.time);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime + n.time);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + n.time + n.dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + n.time);
        osc.stop(this.ctx.currentTime + n.time + n.dur);
      } catch (e) {}
    });
  }
}

const sfx = new SoundFX();

// ==========================================
// 4. Confetti (폭죽 축하 파티클 시스템)
// ==========================================
class ConfettiEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  fire() {
    this.particles = [];
    const colors = ['#6366f1', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#ffffff', '#a855f7'];

    // 좌우 양쪽에서 폭죽 발사
    for (let i = 0; i < 90; i++) {
      // 좌측 발사
      this.particles.push({
        x: window.innerWidth * 0.2,
        y: window.innerHeight * 0.7,
        vx: (Math.random() * 8) - 2,
        vy: -(Math.random() * 14 + 8),
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        gravity: 0.35,
        opacity: 1
      });

      // 우측 발사
      this.particles.push({
        x: window.innerWidth * 0.8,
        y: window.innerHeight * 0.7,
        vx: -(Math.random() * 8) + 2,
        vy: -(Math.random() * 14 + 8),
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        gravity: 0.35,
        opacity: 1
      });
    }

    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.render();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.rotation += p.vRot;
      p.opacity -= 0.008;

      if (p.opacity <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.render());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.animationId = null;
    }
  }
}

const confetti = new ConfettiEngine(elements.confettiCanvas);

// ==========================================
// 5. 사용자의 핵심 로직 (Python get_settings / select_speakers)
// ==========================================

/**
 * 1) 번호 모드 후보자 계산 (사용자의 기존 로직)
 * - 전체 사람 번호: 1 ~ num1
 * - 제외 번호 제거: allowed_numbers = total_numbers - exclude_numbers
 */
function getAllowedNumbers() {
  const num1 = parseInt(elements.totalInput.value, 10) || 0;
  if (num1 <= 0) return [];

  // 사용자 입력 제외 번호 파싱 (쉼표 또는 공백)
  const excludeStr = elements.excludeInput.value || '';
  const excludeNumbers = new Set();

  excludeStr.replace(/,/g, ' ').split(/\s+/).forEach(item => {
    const val = parseInt(item.trim(), 10);
    if (!isNaN(val) && val >= 1) {
      excludeNumbers.add(val);
    }
  });

  // 1부터 num1까지 번호 중 제외 번호를 뺀 허용 번호 목록 생성
  const allowed = [];
  for (let i = 1; i <= num1; i++) {
    if (!excludeNumbers.has(i)) {
      allowed.push(i);
    }
  }

  return allowed;
}

/**
 * 2) 이름 모드 후보자 목록 파싱
 */
function getAllowedNames() {
  const rawText = elements.namesInput.value || '';
  const names = rawText
    .split(/[\n,]/)
    .map(name => name.trim())
    .filter(name => name.length > 0);
  
  // 중복 제거
  return Array.from(new Set(names));
}

/**
 * 현재 모드에 따른 허용 후보자 목록 반환
 */
function getActiveCandidates() {
  if (state.mode === 'number') {
    return getAllowedNumbers().map(num => ({ id: num, label: `${num}번`, raw: num }));
  } else {
    return getAllowedNames().map((name, idx) => ({ id: idx + 1, label: name, raw: name }));
  }
}

/**
 * 발표자 랜덤 추출 (Python의 random.sample(allowed_numbers, num2) 동일 로직)
 */
function selectSpeakers(speakerCount, candidates) {
  // Fisher-Yates shuffle 알고리즘 기반 중복 없는 랜덤 추출
  const pool = [...candidates];
  const chosen = [];
  const k = Math.min(speakerCount, pool.length);

  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * (pool.length - i)) + i;
    // swap
    const temp = pool[i];
    pool[i] = pool[randomIndex];
    pool[randomIndex] = temp;
    chosen.push(pool[i]);
  }

  // 오름차순 정렬 옵션 처리
  if (state.sortResult) {
    if (state.mode === 'number') {
      chosen.sort((a, b) => a.raw - b.raw);
    } else {
      chosen.sort((a, b) => a.label.localeCompare(b.label, 'ko'));
    }
  }

  return chosen;
}

// ==========================================
// 6. UI 업데이트 및 이벤트 핸들러
// ==========================================

function updateCandidateBadge() {
  const candidates = getActiveCandidates();
  elements.candidateBadge.textContent = `추첨 가능: ${candidates.length}명`;
  
  // 만약 후보자가 뽑을 수보다 적으면 경고 색상
  const count = parseInt(elements.speakerInput.value, 10) || 1;
  if (candidates.length < count) {
    elements.candidateBadge.style.color = '#ef4444';
    elements.candidateBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    elements.candidateBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
  } else {
    elements.candidateBadge.style.color = '#38bdf8';
    elements.candidateBadge.style.borderColor = 'rgba(56, 189, 248, 0.25)';
    elements.candidateBadge.style.backgroundColor = 'rgba(56, 189, 248, 0.12)';
  }

  renderExcludeChips();
}

function renderExcludeChips() {
  if (state.mode !== 'number') {
    elements.excludeChipsContainer.innerHTML = '';
    return;
  }

  const excludeStr = elements.excludeInput.value || '';
  const excludeNumbers = [];
  excludeStr.replace(/,/g, ' ').split(/\s+/).forEach(item => {
    const val = parseInt(item.trim(), 10);
    if (!isNaN(val) && !excludeNumbers.includes(val)) {
      excludeNumbers.push(val);
    }
  });

  excludeNumbers.sort((a, b) => a - b);

  elements.excludeChipsContainer.innerHTML = '';
  excludeNumbers.forEach(num => {
    const chip = document.createElement('span');
    chip.className = 'chip-tag';
    chip.innerHTML = `
      <span>🚫 ${num}번</span>
      <span class="chip-remove" title="제외 해제" data-num="${num}">✕</span>
    `;
    elements.excludeChipsContainer.appendChild(chip);
  });
}

function removeExcludedNumber(numToRemove) {
  const currentStr = elements.excludeInput.value || '';
  const remaining = [];
  currentStr.replace(/,/g, ' ').split(/\s+/).forEach(item => {
    const val = parseInt(item.trim(), 10);
    if (!isNaN(val) && val !== numToRemove) {
      remaining.push(val);
    }
  });
  elements.excludeInput.value = remaining.join(', ');
  updateCandidateBadge();
}

// 토스트 메시지
let toastTimer = null;
function showToast(text, icon = '✅') {
  elements.toastText.textContent = text;
  elements.toastIcon.textContent = icon;
  elements.toast.classList.remove('hidden');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 2600);
}

// ==========================================
// 7. 메인 추첨 애니메이션 및 실행
// ==========================================

function startDraw() {
  if (state.isRolling) return;

  const candidates = getActiveCandidates();
  const speakerCount = parseInt(elements.speakerInput.value, 10) || 1;

  // 유효성 검사
  if (candidates.length === 0) {
    showToast('추첨 가능한 후보자가 없습니다! 설정을 확인해주세요.', '⚠️');
    return;
  }

  if (speakerCount <= 0) {
    showToast('발표자 수는 최소 1명 이상이어야 합니다.', '⚠️');
    return;
  }

  if (speakerCount > candidates.length) {
    showToast(`발표자 수(${speakerCount}명)가 후보자 수(${candidates.length}명)보다 많습니다!`, '⚠️');
    return;
  }

  // 오디오 컨텍스트 사용자 제스처 활성화
  sfx.init();

  // 추첨 시작 상태 변경
  state.isRolling = true;
  elements.drawBtn.disabled = true;
  elements.drawBtn.querySelector('.btn-text').textContent = '두구두구... 추첨 중!';
  elements.copyResultBtn.disabled = true;

  // UI 상태 변경
  elements.emptyState.classList.add('hidden');
  elements.rollingStatus.classList.remove('hidden');
  elements.winnerGrid.innerHTML = '';

  // 카드 슬롯 생성 (초기 상태 물음표)
  const cardElements = [];
  for (let i = 0; i < speakerCount; i++) {
    const card = document.createElement('div');
    card.className = 'winner-card rolling';
    card.innerHTML = `
      <div class="winner-rank-badge">발표자 ${i + 1}</div>
      <div class="winner-value">?</div>
      <div class="winner-icon">🎲</div>
    `;
    elements.winnerGrid.appendChild(card);
    cardElements.push(card);
  }

  // 롤링 애니메이션 (점진적 감속)
  const duration = 1800; // 1.8초 동안 긴장감 형성
  const startTime = performance.now();

  function rollFrame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    if (progress < 1) {
      // 롤링 중 임의 후보자 표시
      const tempSample = selectSpeakers(speakerCount, candidates);
      cardElements.forEach((card, idx) => {
        if (tempSample[idx]) {
          card.querySelector('.winner-value').textContent = tempSample[idx].label;
        }
      });

      sfx.playTick();

      // 지수 감속을 통한 자연스러운 룰렛 느낌 (초반 50ms -> 후반 160ms)
      const nextDelay = 45 + Math.pow(progress, 2) * 120;
      setTimeout(() => {
        if (state.isRolling) {
          requestAnimationFrame(rollFrame);
        }
      }, nextDelay);
    } else {
      // 최종 추첨 확정
      finishDraw(speakerCount, candidates, cardElements);
    }
  }

  requestAnimationFrame(rollFrame);
}

function finishDraw(speakerCount, candidates, cardElements) {
  // 실제 최종 발표자 선정!
  const finalWinners = selectSpeakers(speakerCount, candidates);
  state.lastWinners = finalWinners;

  // 카드 완료 상태로 전환
  cardElements.forEach((card, idx) => {
    const winner = finalWinners[idx];
    card.classList.remove('rolling');
    card.classList.add('confirmed');
    card.querySelector('.winner-value').textContent = winner.label;
    card.querySelector('.winner-icon').textContent = '🌟';
  });

  // 사운드 및 폭죽
  sfx.playFanfare();
  confetti.fire();

  // 자동 제외 옵션 처리 (번호 모드인 경우)
  if (state.autoExclude && state.mode === 'number') {
    const currentExcludeStr = elements.excludeInput.value || '';
    const excludeSet = new Set();
    currentExcludeStr.replace(/,/g, ' ').split(/\s+/).forEach(x => {
      const val = parseInt(x.trim(), 10);
      if (!isNaN(val)) excludeSet.add(val);
    });

    finalWinners.forEach(w => excludeSet.add(w.raw));
    const sorted = Array.from(excludeSet).sort((a, b) => a - b);
    elements.excludeInput.value = sorted.join(', ');
  }

  // 히스토리 추가
  addHistory(finalWinners);

  // UI 상태 복원
  state.isRolling = false;
  elements.rollingStatus.classList.add('hidden');
  elements.drawBtn.disabled = false;
  elements.drawBtn.querySelector('.btn-text').textContent = '🎲 다시 발표자 뽑기!';
  elements.copyResultBtn.disabled = false;

  updateCandidateBadge();
  showToast(`🎉 발표자 ${finalWinners.length}명이 선정되었습니다!`, '🏆');
}

// ==========================================
// 8. 히스토리 & 복사 기능
// ==========================================

function addHistory(winners) {
  const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const resultText = winners.map(w => w.label).join(', ');

  state.history.unshift({ time: timeStr, text: resultText });
  if (state.history.length > 20) state.history.pop();

  renderHistory();
}

function renderHistory() {
  if (state.history.length === 0) {
    elements.historyList.innerHTML = '<div class="history-empty">아직 추첨 기록이 없습니다.</div>';
    return;
  }

  elements.historyList.innerHTML = '';
  state.history.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <span class="history-time">${item.time} (${idx + 1}회차)</span>
      <span class="history-winners">${item.text}</span>
    `;
    elements.historyList.appendChild(div);
  });
}

function copyResult() {
  if (!state.lastWinners || state.lastWinners.length === 0) return;

  const winnerList = state.lastWinners.map((w, i) => `${i + 1}번 발표자: ${w.label}`).join('\n');
  const fullText = `📢 [발표자 추첨 결과]\n${winnerList}\n(일시: ${new Date().toLocaleString('ko-KR')})`;

  navigator.clipboard.writeText(fullText)
    .then(() => {
      showToast('클립보드에 결과가 복사되었습니다!', '📋');
    })
    .catch(() => {
      showToast('복사 권한이 거부되었습니다.', '❌');
    });
}

// ==========================================
// 9. 이벤트 리스너 등록
// ==========================================

function initEventListeners() {
  // 모드 전환
  elements.tabNumber.addEventListener('click', () => {
    state.mode = 'number';
    elements.tabNumber.classList.add('active');
    elements.tabName.classList.remove('active');
    elements.panelNumber.classList.add('active');
    elements.panelName.classList.remove('active');
    updateCandidateBadge();
  });

  elements.tabName.addEventListener('click', () => {
    state.mode = 'name';
    elements.tabName.classList.add('active');
    elements.tabNumber.classList.remove('active');
    elements.panelName.classList.add('active');
    elements.panelNumber.classList.remove('active');
    updateCandidateBadge();
  });

  // 입력 감지
  elements.totalInput.addEventListener('input', updateCandidateBadge);
  elements.excludeInput.addEventListener('input', updateCandidateBadge);
  elements.namesInput.addEventListener('input', updateCandidateBadge);

  // 제외 칩 클릭하여 제거
  elements.excludeChipsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip-remove')) {
      const num = parseInt(e.target.dataset.num, 10);
      removeExcludedNumber(num);
    }
  });

  // 프리셋 버튼
  elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.totalInput.value = btn.dataset.value;
      updateCandidateBadge();
    });
  });

  // 스텝퍼 (+ / -)
  elements.speakerMinusBtn.addEventListener('click', () => {
    const cur = parseInt(elements.speakerInput.value, 10) || 1;
    if (cur > 1) {
      elements.speakerInput.value = cur - 1;
      updateCandidateBadge();
    }
  });

  elements.speakerPlusBtn.addEventListener('click', () => {
    const cur = parseInt(elements.speakerInput.value, 10) || 1;
    elements.speakerInput.value = cur + 1;
    updateCandidateBadge();
  });

  elements.speakerInput.addEventListener('input', updateCandidateBadge);

  // 옵션 체크박스
  elements.autoExcludeChk.addEventListener('change', (e) => {
    state.autoExclude = e.target.checked;
  });

  elements.sortResultChk.addEventListener('change', (e) => {
    state.sortResult = e.target.checked;
  });

  // 사운드 토글
  elements.soundToggleBtn.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    if (state.soundEnabled) {
      elements.soundToggleBtn.classList.add('active');
      elements.soundIcon.textContent = '🔊';
      elements.soundLabel.textContent = '효과음 켜짐';
      sfx.playTick();
    } else {
      elements.soundToggleBtn.classList.remove('active');
      elements.soundIcon.textContent = '🔇';
      elements.soundLabel.textContent = '효과음 꺼짐';
    }
  });

  // 추첨 버튼
  elements.drawBtn.addEventListener('click', startDraw);

  // 복사 버튼
  elements.copyResultBtn.addEventListener('click', copyResult);

  // 제외 초기화 버튼
  elements.clearExcludeBtn.addEventListener('click', () => {
    elements.excludeInput.value = '';
    updateCandidateBadge();
    showToast('제외 번호 목록이 초기화되었습니다.', '🔄');
  });

  // 히스토리 삭제
  elements.clearHistoryBtn.addEventListener('click', () => {
    state.history = [];
    renderHistory();
    showToast('추첨 기록이 삭제되었습니다.', '🗑️');
  });
}

// 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  updateCandidateBadge();
});
