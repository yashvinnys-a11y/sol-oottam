'use strict';

(() => {
  const APP_VERSION = '0.9.0';
  const PROGRESS_KEY = 'solOottamProgressV2';
  const LOG_KEY = 'solOottamEvaluationV1';
  const SETTINGS_KEY = 'solOottamSettingsV1';
  const LEGACY_PROGRESS_KEYS = ['twRunner4L', 'solOottam3'];
  const MAX_LIVES = 3;
  const MAX_LOG_EVENTS = 5000;

  const data = window.SOL_OOTTAM_DATA;
  if (!data) {
    showFatalEarly('words.js did not load. Confirm that index.html, words.js and app.js are in the same folder.');
    return;
  }
  const { WORDS, DECOY_POOL } = data;

  const $ = (id) => document.getElementById(id);
  const SCREENS = [
    'hubScreen', 'gameScreen', 'traceScreen', 'sentenceScreen', 'readScreen',
    'resultsScreen', 'passportScreen', 'dataScreen', 'guideScreen'
  ];
  const MODAL_OVERLAYS = ['revealOverlay', 'levelWinOverlay', 'levelFailOverlay', 'confirmOverlay', 'fatalOverlay'];

  let toastTimer = null;
  const timers = new Set();
  let confirmCallback = null;
  let lastFocusedElement = null;
  let activeRecognition = null;
  let cachedSettings = null;
  const SESSION_ID = createId('session');
  const SESSION_STARTED_AT = new Date().toISOString();

  function showFatalEarly(message) {
    const overlay = document.getElementById('fatalOverlay');
    const output = document.getElementById('fatalMessage');
    if (output) output.textContent = message;
    if (overlay) overlay.classList.add('active');
    else document.body.textContent = message;
  }

  function createId(prefix = 'id') {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function later(fn, delay) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, delay);
    timers.add(id);
    return id;
  }

  function clearTimers() {
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
  }

  function safeCancelSpeech() {
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) { /* no-op */ }
    }
  }

  function stopRecognition() {
    if (activeRecognition) {
      try {
        activeRecognition.onresult = null;
        activeRecognition.onerror = null;
        activeRecognition.onend = null;
        activeRecognition.abort();
      } catch (_) { /* no-op */ }
      activeRecognition = null;
    }
  }

  function speak(text, rate = 0.76, onEnd = null) {
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') {
      if (onEnd) later(onEnd, 100);
      return false;
    }
    safeCancelSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ta-IN';
    utterance.rate = rate;
    const voices = window.speechSynthesis.getVoices?.() || [];
    const tamilVoice = voices.find((voice) => String(voice.lang).toLowerCase().startsWith('ta'));
    if (tamilVoice) utterance.voice = tamilVoice;
    if (onEnd) utterance.onend = onEnd;
    utterance.onerror = () => { if (onEnd) onEnd(); };
    try {
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (_) {
      if (onEnd) later(onEnd, 100);
      return false;
    }
  }

  function toast(message, duration = 1050) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove('show'), duration);
  }

  function rand(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function validateWordBank() {
    const errors = [];
    const required = [
      'id', 'tamil', 'letters', 'english', 'partOfSpeech', 'category', 'difficulty',
      'meaning', 'example', 'sentence', 'sentenceEn', 'acceptedSpeechVariants',
      'distractors', 'feedback', 'icon'
    ];
    const ids = new Set();
    const tamilWords = new Set(WORDS.map((word) => word.tamil));

    if (WORDS.length !== 10) errors.push(`Expected 10 words, found ${WORDS.length}.`);

    WORDS.forEach((word, index) => {
      required.forEach((field) => {
        if (word[field] === undefined || word[field] === null || word[field] === '') {
          errors.push(`Word ${index + 1} is missing "${field}".`);
        }
      });
      if (ids.has(word.id)) errors.push(`Duplicate id: ${word.id}.`);
      ids.add(word.id);
      if (!Array.isArray(word.letters) || word.letters.length < 2) {
        errors.push(`${word.id}: letters must contain at least two grapheme units.`);
      } else if (word.letters.join('').normalize('NFC') !== word.tamil.normalize('NFC')) {
        errors.push(`${word.id}: letters do not join to the Tamil word.`);
      }
      if ((word.sentence.match(/___/g) || []).length !== 1) {
        errors.push(`${word.id}: sentence must contain exactly one ___ placeholder.`);
      }
      if ((word.sentenceEn.match(/___/g) || []).length !== 1) {
        errors.push(`${word.id}: sentenceEn must contain exactly one ___ placeholder.`);
      }
      if (!Array.isArray(word.acceptedSpeechVariants) || word.acceptedSpeechVariants.length < 1) {
        errors.push(`${word.id}: at least one speech variant is required.`);
      }
      if (!Array.isArray(word.distractors) || word.distractors.length < 3) {
        errors.push(`${word.id}: at least three distractors are required.`);
      } else {
        word.distractors.forEach((distractor) => {
          if (!tamilWords.has(distractor)) errors.push(`${word.id}: unknown distractor "${distractor}".`);
          if (distractor === word.tamil) errors.push(`${word.id}: a distractor cannot equal the answer.`);
        });
      }
      if (!word.feedback || !word.feedback.correct || !word.feedback.hint) {
        errors.push(`${word.id}: feedback.correct and feedback.hint are required.`);
      }
    });

    return errors;
  }

  function defaultProgress() {
    return {
      version: 2,
      levelsComplete: [false, false, false, false],
      learned: [],
      bestScore: 0,
      tracedWords: 0,
      tracedLetters: 0,
      spokenPractice: 0,
      speechRecognized: 0,
      manualSpeechConfirmations: 0,
      stars: 0,
      lastPlayedAt: null
    };
  }

  function normalizeProgress(raw) {
    const base = defaultProgress();
    const source = raw && typeof raw === 'object' ? raw : {};
    const levels = Array.isArray(source.levelsComplete) ? source.levelsComplete : [];
    return {
      ...base,
      ...source,
      version: 2,
      levelsComplete: Array.from({ length: 4 }, (_, i) => Boolean(levels[i])),
      learned: Array.isArray(source.learned)
        ? [...new Set(source.learned.filter((item) => WORDS.some((word) => word.tamil === item)))]
        : [],
      bestScore: Math.max(0, Number(source.bestScore) || 0),
      tracedWords: Math.max(0, Number(source.tracedWords ?? source.traced) || 0),
      tracedLetters: Math.max(0, Number(source.tracedLetters) || 0),
      spokenPractice: Math.max(0, Number(source.spokenPractice ?? source.spoken) || 0),
      speechRecognized: Math.max(0, Number(source.speechRecognized) || 0),
      manualSpeechConfirmations: Math.max(0, Number(source.manualSpeechConfirmations) || 0),
      stars: Math.max(0, Math.min(3, Number(source.stars) || 0))
    };
  }

  function getProgress() {
    try {
      const current = window.localStorage.getItem(PROGRESS_KEY);
      if (current) return normalizeProgress(JSON.parse(current));
      for (const legacyKey of LEGACY_PROGRESS_KEYS) {
        const value = window.localStorage.getItem(legacyKey);
        if (value) {
          const migrated = normalizeProgress(JSON.parse(value));
          saveProgress(migrated);
          return migrated;
        }
      }
    } catch (_) { /* use default */ }
    return defaultProgress();
  }

  function saveProgress(progress) {
    const normalized = normalizeProgress({ ...progress, lastPlayedAt: new Date().toISOString() });
    try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(normalized)); } catch (_) { /* storage unavailable */ }
    return normalized;
  }

  function defaultSettings() {
    return { participantCode: generateParticipantCode() };
  }

  function loadSettings() {
    if (cachedSettings) return { ...cachedSettings };
    try {
      const parsed = JSON.parse(window.localStorage.getItem(SETTINGS_KEY));
      if (parsed && typeof parsed.participantCode === 'string' && parsed.participantCode.trim()) {
        cachedSettings = { participantCode: parsed.participantCode.trim().slice(0, 24) };
      }
    } catch (_) { /* create a local anonymous code below */ }
    if (!cachedSettings) {
      cachedSettings = defaultSettings();
      try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(cachedSettings)); } catch (_) { /* storage unavailable */ }
    }
    return { ...cachedSettings };
  }

  function saveSettings(settings) {
    cachedSettings = { participantCode: String(settings.participantCode || generateParticipantCode()).slice(0, 24) };
    try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(cachedSettings)); } catch (_) { /* no-op */ }
  }

  function generateParticipantCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let value = 'P-';
    const bytes = new Uint8Array(6);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    bytes.forEach((byte) => { value += alphabet[byte % alphabet.length]; });
    return value;
  }

  function loadLogs() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(LOG_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveLogs(logs) {
    try { window.localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(-MAX_LOG_EVENTS))); } catch (_) { /* no-op */ }
  }

  function deviceSummary() {
    const platform = navigator.userAgentData?.platform || navigator.platform || 'unknown';
    return {
      platform,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      touch: Number(navigator.maxTouchPoints || 0),
      language: navigator.language || 'unknown'
    };
  }

  function logEvent(event, details = {}) {
    const settings = loadSettings();
    const entry = {
      eventId: createId('event'),
      sessionId: SESSION_ID,
      timestamp: new Date().toISOString(),
      participantCode: settings.participantCode || '',
      appVersion: APP_VERSION,
      event,
      ...deviceSummary(),
      ...details
    };
    // Deliberately do not persist recognised transcript or audio data.
    delete entry.transcript;
    delete entry.audio;
    const logs = loadLogs();
    logs.push(entry);
    saveLogs(logs);
    return entry;
  }

  function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function downloadBlob(filename, mimeType, contents) {
    const blob = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    later(() => URL.revokeObjectURL(url), 500);
  }

  function exportCsv() {
    const logs = loadLogs();
    const fields = [
      'eventId', 'sessionId', 'timestamp', 'participantCode', 'appVersion', 'event',
      'level', 'taskType', 'itemId', 'outcome', 'attempt', 'durationMs', 'score',
      'lives', 'confidence', 'similarity', 'replays', 'skips', 'platform', 'viewport',
      'touch', 'language', 'reason'
    ];
    const rows = [fields.join(',')];
    logs.forEach((entry) => rows.push(fields.map((field) => csvEscape(entry[field])).join(',')));
    downloadBlob(`sol-oottam-evaluation-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8', `\ufeff${rows.join('\n')}`);
    logEvent('evaluation_export', { outcome: 'csv', score: logs.length });
  }

  function exportJson() {
    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      sessionStartedAt: SESSION_STARTED_AT,
      wordBankVersion: APP_VERSION,
      participantCode: loadSettings().participantCode,
      privacyNote: 'No audio or recognised transcript is stored by Sol Oottam.',
      events: loadLogs()
    };
    downloadBlob(`sol-oottam-evaluation-${new Date().toISOString().slice(0, 10)}.json`, 'application/json;charset=utf-8', JSON.stringify(payload, null, 2));
    logEvent('evaluation_export', { outcome: 'json', score: payload.events.length });
  }

  function show(screenId) {
    clearTimers();
    safeCancelSpeech();
    stopRecognition();
    SCREENS.forEach((id) => $(id).classList.toggle('active', id === screenId));
    MODAL_OVERLAYS.forEach((id) => $(id).classList.remove('active'));
    const screen = $(screenId);
    if (screen) {
      screen.setAttribute('tabindex', '-1');
      later(() => screen.focus({ preventScroll: true }), 0);
    }
  }

  function showOverlay(id) {
    lastFocusedElement = document.activeElement;
    $(id).classList.add('active');
    const target = $(id).querySelector('button:not([disabled]),h2,[tabindex]');
    later(() => target?.focus({ preventScroll: true }), 0);
  }

  function hideOverlay(id) {
    $(id).classList.remove('active');
    lastFocusedElement?.focus?.({ preventScroll: true });
  }

  function confirmAction(title, message, confirmLabel, callback) {
    $('confirmTitle').textContent = title;
    $('confirmMessage').textContent = message;
    $('confirmYesBtn').textContent = confirmLabel;
    confirmCallback = callback;
    showOverlay('confirmOverlay');
  }

  function renderLives(elementId, lives) {
    $(elementId).textContent = `${'❤️'.repeat(Math.max(0, lives))}${'🖤'.repeat(Math.max(0, MAX_LIVES - lives))}`;
  }

  function renderDots(elementId, total, current) {
    const holder = $(elementId);
    holder.innerHTML = '';
    Array.from({ length: total }, (_, i) => {
      const dot = document.createElement('div');
      dot.className = `p-dot${i < current ? ' done' : i === current ? ' cur' : ''}`;
      dot.setAttribute('aria-hidden', 'true');
      holder.appendChild(dot);
    });
    holder.setAttribute('aria-label', `Item ${Math.min(current + 1, total)} of ${total}`);
  }

  const LEVEL_INFO = [
    { num: 1, icon: '🏃', name: 'Runner', desc: 'Collect Tamil letter units to build all 10 words.' },
    { num: 2, icon: '✍️', name: 'Guided Tracing', desc: 'Follow each Tamil letter guide with touch or mouse.' },
    { num: 3, icon: '🧩', name: 'Sentence Fill', desc: 'Choose the word that correctly completes each sentence.' },
    { num: 4, icon: '🗣️', name: 'Read Aloud', desc: 'Listen, read aloud, and use optional browser speech checking.' }
  ];

  function renderHub() {
    const progress = getProgress();
    const grouped = WORDS.reduce((acc, word) => {
      const key = word.partOfSpeech;
      if (!acc[key]) acc[key] = [];
      acc[key].push(word);
      return acc;
    }, {});
    $('homeChips').innerHTML = '';
    Object.entries(grouped).forEach(([category, words]) => {
      const group = document.createElement('div');
      group.className = 'home-category';
      const label = document.createElement('div');
      label.className = 'category-label';
      label.textContent = category;
      const chips = document.createElement('div');
      chips.className = 'word-chips';
      words.forEach((word) => {
        const chip = document.createElement('span');
        chip.textContent = `${word.icon} ${word.tamil}`;
        chips.appendChild(chip);
      });
      group.append(label, chips);
      $('homeChips').appendChild(group);
    });

    $('levelGrid').innerHTML = '';
    LEVEL_INFO.forEach((level, index) => {
      const locked = index > 0 && !progress.levelsComplete[index - 1];
      const done = progress.levelsComplete[index];
      const nextUp = !done && (index === 0 || progress.levelsComplete[index - 1]);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `level-card${done ? ' done' : ''}${nextUp ? ' active-level' : ''}`;
      button.disabled = locked;
      button.setAttribute('aria-label', `Level ${level.num}: ${level.name}${locked ? ', locked' : done ? ', complete' : ''}`);
      button.innerHTML = `<div class="level-num">Level ${level.num}</div><div class="level-icon" aria-hidden="true">${level.icon}</div><div class="level-name">${level.name}</div><div class="level-desc">${level.desc}</div>${locked ? '<div class="lock-icon" aria-hidden="true">🔒</div>' : ''}`;
      if (!locked) {
        button.addEventListener('click', () => {
          if (index === 0) startLevel1();
          else if (index === 1) startLevel2();
          else if (index === 2) startLevel3();
          else startLevel4();
        });
      }
      $('levelGrid').appendChild(button);
    });
  }

  // ---------------------------------------------------------------------------
  // Level 1: runner
  // ---------------------------------------------------------------------------
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const CW = 780;
  const CH = 410;
  const LANE_Y = [172, 258, 344];
  const PLAYER_X = 118;
  const TILE = 29;
  const COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#22d3ee', '#fb7185', '#f97316', '#818cf8'];
  const COIN_SCORE = 3;
  const STAR_SCORE = 25;
  const CORRECT_SCORE = 12;
  const WRONG_PENALTY = 15;
  const OBSTACLE_PENALTY = 22;
  const WORD_SCORE = 100;

  const BLDGS = [];
  const TREES = [];
  let BLDG_W = 0;
  let TREE_W = 0;
  (() => {
    let x = 0;
    [44, 36, 52, 40, 48, 38, 55, 42, 35, 50, 46].forEach((width, i) => {
      BLDGS.push({ x, w: width, h: [80, 110, 70, 95, 60, 100, 85, 75, 115, 90, 65][i] });
      x += width + 10;
    });
    BLDG_W = x;
    x = 0;
    [38, 25, 42, 30, 36, 45, 28, 40].forEach((width) => {
      TREES.push({ x, w: width });
      x += width + 24;
    });
    TREE_W = x;
  })();

  let gActive = false;
  let gPaused = false;
  let pTargetLane = 1;
  let pY = LANE_Y[1];
  let wordIdx = 0;
  let letterIdx = 0;
  let completed = [];
  let letters = [];
  let coins = [];
  let obstacles = [];
  let particles = [];
  let score = 0;
  let streak = 0;
  let l1Lives = MAX_LIVES;
  let spawnT = 70;
  let decoyT = 25;
  let coinT = 10;
  let obstacleT = 80;
  let bgOff = 0;
  let midOff = 0;
  let fgOff = 0;
  let rAF = null;
  let lastTs = 0;
  let shieldTime = 0;
  let magnetTime = 0;
  let level1StartedAt = 0;
  let revealedWord = null;

  function currentWord() { return WORDS[wordIdx % WORDS.length]; }
  function currentLetter() { return currentWord().letters[letterIdx]; }
  function speedMultiplier() { return 1 + Math.min(Math.floor(score / 40) * 0.055, 0.66); }

  function updateHUD() {
    score = Math.max(0, Math.round(score));
    $('scoreDisplay').textContent = String(score);
    $('streakDisplay').textContent = String(streak);
    $('livesDisplay').textContent = '❤️'.repeat(Math.max(0, l1Lives));

    const holder = $('wordProgress');
    holder.innerHTML = '<span class="wp-label">Collect:</span>';
    currentWord().letters.forEach((letter, i) => {
      const slot = document.createElement('div');
      slot.className = `letter-slot${i < letterIdx ? ' collected' : i === letterIdx ? ' current' : ''}`;
      slot.textContent = i < letterIdx ? letter : '';
      slot.setAttribute('aria-label', i < letterIdx ? `${letter} collected` : i === letterIdx ? 'current target' : 'not collected');
      holder.appendChild(slot);
    });

    const footer = $('footerTracker');
    footer.innerHTML = '';
    WORDS.forEach((word, i) => {
      const slot = document.createElement('div');
      const isDone = completed.includes(word.tamil);
      slot.className = `word-slot${isDone ? ' filled' : ''}`;
      slot.textContent = isDone ? word.tamil : String(i + 1);
      slot.title = isDone ? word.english : `Word ${i + 1}`;
      footer.appendChild(slot);
    });
  }

  function startLevel1() {
    stopRunner(false);
    gActive = true;
    gPaused = false;
    pTargetLane = 1;
    pY = LANE_Y[1];
    wordIdx = 0;
    letterIdx = 0;
    completed = [];
    letters = [];
    coins = [];
    obstacles = [];
    particles = [];
    score = 0;
    streak = 0;
    l1Lives = MAX_LIVES;
    shieldTime = 0;
    magnetTime = 0;
    spawnT = 65;
    decoyT = 35;
    coinT = 8;
    obstacleT = 115;
    bgOff = 0;
    midOff = 0;
    fgOff = 0;
    level1StartedAt = performance.now();
    $('pauseBtn').textContent = '⏸ Pause';
    $('pauseBtn').setAttribute('aria-pressed', 'false');
    updateHUD();
    show('gameScreen');
    logEvent('level_start', { level: 1, taskType: 'runner' });
    lastTs = performance.now();
    rAF = requestAnimationFrame(gameLoop);
  }

  function stopRunner(logAbandon = false) {
    if (logAbandon && (gActive || completed.length > 0) && completed.length < WORDS.length) {
      logEvent('level_abandon', { level: 1, taskType: 'runner', score, lives: l1Lives, outcome: 'hub' });
    }
    gActive = false;
    gPaused = false;
    if (rAF) cancelAnimationFrame(rAF);
    rAF = null;
  }

  function togglePause() {
    if (!gActive) return;
    if (gPaused) resumeRunner();
    else pauseRunner('user');
  }

  function pauseRunner(reason = 'user') {
    if (!gActive || gPaused) return;
    gPaused = true;
    if (rAF) cancelAnimationFrame(rAF);
    rAF = null;
    $('pauseBtn').textContent = '▶ Resume';
    $('pauseBtn').setAttribute('aria-pressed', 'true');
    renderGame();
    drawPausedOverlay();
    logEvent('runner_pause', { level: 1, taskType: 'runner', reason, score, lives: l1Lives });
  }

  function resumeRunner() {
    if (!gActive || !gPaused) return;
    gPaused = false;
    $('pauseBtn').textContent = '⏸ Pause';
    $('pauseBtn').setAttribute('aria-pressed', 'false');
    lastTs = performance.now();
    rAF = requestAnimationFrame(gameLoop);
    logEvent('runner_resume', { level: 1, taskType: 'runner', score, lives: l1Lives });
  }

  function gameLoop(timestamp) {
    if (!gActive || gPaused) return;
    const dt = Math.min((timestamp - lastTs) / 16.67, 3);
    lastTs = timestamp;
    const speed = speedMultiplier();
    pY += (LANE_Y[pTargetLane] - pY) * 0.2 * dt;
    bgOff = (bgOff + 0.8 * speed * dt) % BLDG_W;
    midOff = (midOff + 1.9 * speed * dt) % TREE_W;
    fgOff = (fgOff + 3.5 * speed * dt) % 80;
    if (shieldTime > 0) shieldTime -= dt / 60;
    if (magnetTime > 0) magnetTime -= dt / 60;
    coinT -= dt;
    if (coinT <= 0) { spawnCoin(); coinT = 14 + Math.random() * 22; }
    decoyT -= dt;
    if (decoyT <= 0) { spawnDecoy(); decoyT = 40 + Math.random() * 42; }
    spawnT -= dt;
    if (spawnT <= 0) { spawnCorrect(); spawnT = 150 + Math.random() * 150; }
    obstacleT -= dt;
    if (obstacleT <= 0) { spawnObstacle(); obstacleT = 125 + Math.random() * 85; }
    moveAndCollide(dt, speed);
    renderGame();
    if (gActive && !gPaused) rAF = requestAnimationFrame(gameLoop);
  }

  function laneIndex(y) {
    let best = 0;
    let distance = Infinity;
    LANE_Y.forEach((laneY, i) => {
      const currentDistance = Math.abs(laneY - y);
      if (currentDistance < distance) { distance = currentDistance; best = i; }
    });
    return best;
  }

  function allSpawned() { return [...letters, ...coins, ...obstacles]; }
  function clearSpot(x, y) { return !allSpawned().some((item) => Math.abs(item.x - x) < 260 && Math.abs(item.y - y) < 92); }
  function lanesNear(x) {
    const occupied = new Set();
    allSpawned().forEach((item) => { if (Math.abs(item.x - x) < 230) occupied.add(laneIndex(item.y)); });
    return occupied;
  }
  function blocksAllLanes(x, lane) {
    const occupied = lanesNear(x);
    occupied.add(lane);
    return occupied.size >= 3;
  }
  function findSpawnSpot(kind) {
    for (let n = 0; n < 18; n += 1) {
      const x = CW + 120 + n * 145 + Math.random() * 95;
      for (const lane of shuffle([0, 1, 2])) {
        const y = LANE_Y[lane];
        if (!clearSpot(x, y)) continue;
        if (kind !== 'coin' && blocksAllLanes(x, lane)) continue;
        return { x, y, lane };
      }
    }
    return null;
  }

  function spawnCorrect() {
    const spot = findSpawnSpot('target');
    if (!spot || !currentLetter()) return;
    letters.push({ x: spot.x, y: spot.y, ch: currentLetter(), isTarget: true, color: COLORS[letterIdx % COLORS.length], hit: false });
  }
  function spawnDecoy() {
    const spot = findSpawnSpot('decoy');
    if (!spot) return;
    const validDecoys = DECOY_POOL.filter((item) => item !== currentLetter());
    letters.push({ x: spot.x, y: spot.y, ch: rand(validDecoys), isTarget: false, color: '#64748b', hit: false });
  }
  function spawnCoin() {
    const spot = findSpawnSpot('coin');
    if (!spot) return;
    const roll = Math.random();
    const type = roll < 0.12 ? 'star' : roll < 0.25 ? 'shield' : roll < 0.36 ? 'magnet' : 'coin';
    coins.push({ x: spot.x, y: spot.y, type, spin: 0 });
  }
  function spawnObstacle() {
    const spot = findSpawnSpot('obstacle');
    if (!spot) return;
    obstacles.push({ x: spot.x, y: spot.y, type: Math.random() < 0.5 ? 'rock' : 'barrier', hit: false });
  }

  function moveAndCollide(dt, speed) {
    const letterSpeed = 2.8 * speed;
    for (let i = letters.length - 1; i >= 0; i -= 1) {
      const letter = letters[i];
      letter.x -= letterSpeed * dt;
      if (!letter.hit && Math.abs(letter.x - PLAYER_X) < 33 && Math.abs(letter.y - pY) < 33) {
        if (letter.ch === currentLetter()) {
          letter.hit = true;
          const collectedLetter = currentLetter();
          letterIdx += 1;
          score += CORRECT_SCORE + Math.min(streak, 8);
          streak += 1;
          toast(`சரி! +${CORRECT_SCORE}`);
          burst(letter.x, letter.y, letter.color);
          letters.splice(i, 1);
          logEvent('runner_letter', { level: 1, taskType: 'letter_collection', itemId: currentWord().id, outcome: 'correct', score, lives: l1Lives, reason: collectedLetter });
          updateHUD();
          if (letterIdx >= currentWord().letters.length) { completeRunnerWord(); return; }
        } else {
          score -= WRONG_PENALTY;
          streak = 0;
          toast(`Wrong letter −${WRONG_PENALTY}`);
          burst(letter.x, letter.y, '#fb7185');
          letters.splice(i, 1);
          logEvent('runner_letter', { level: 1, taskType: 'letter_collection', itemId: currentWord().id, outcome: 'incorrect', score, lives: l1Lives });
          updateHUD();
        }
      } else if (letter.x < -70) {
        letters.splice(i, 1);
      }
    }

    for (let i = coins.length - 1; i >= 0; i -= 1) {
      const coin = coins[i];
      coin.x -= 3.2 * speed * dt;
      coin.spin += 0.12 * dt;
      if (magnetTime > 0) {
        const dx = PLAYER_X - coin.x;
        const dy = pY - coin.y;
        if (Math.hypot(dx, dy) < 190) { coin.x += dx * 0.045 * dt; coin.y += dy * 0.045 * dt; }
      }
      if (Math.abs(coin.x - PLAYER_X) < 31 && Math.abs(coin.y - pY) < 31) {
        collectPowerUp(coin);
        coins.splice(i, 1);
      } else if (coin.x < -55) {
        coins.splice(i, 1);
      }
    }

    for (let i = obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = obstacles[i];
      obstacle.x -= 3.35 * speed * dt;
      if (!obstacle.hit && Math.abs(obstacle.x - PLAYER_X) < 34 && Math.abs(obstacle.y - pY) < 34) {
        obstacle.hit = true;
        if (shieldTime > 0) {
          shieldTime = 0;
          toast('Shield blocked it!');
          burst(obstacle.x, obstacle.y, '#22d3ee');
          logEvent('runner_obstacle', { level: 1, taskType: 'runner', outcome: 'shielded', score, lives: l1Lives });
        } else {
          l1Lives -= 1;
          score -= OBSTACLE_PENALTY;
          streak = 0;
          toast(`Obstacle −${OBSTACLE_PENALTY}`);
          burst(obstacle.x, obstacle.y, '#fb7185');
          logEvent('runner_obstacle', { level: 1, taskType: 'runner', outcome: 'hit', score, lives: l1Lives });
          updateHUD();
          if (l1Lives <= 0) {
            stopRunner(false);
            level1Fail();
            return;
          }
        }
        obstacles.splice(i, 1);
      } else if (obstacle.x < -70) {
        obstacles.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 0.18 * dt;
      particle.life -= 0.04 * dt;
      if (particle.life <= 0) particles.splice(i, 1);
    }
  }

  function collectPowerUp(coin) {
    if (coin.type === 'star') { score += STAR_SCORE; streak += 1; toast(`⭐ Star +${STAR_SCORE}`); }
    else if (coin.type === 'shield') { shieldTime = 8; toast('🛡 Shield on'); }
    else if (coin.type === 'magnet') { magnetTime = 8; toast('🧲 Magnet on'); }
    else score += COIN_SCORE;
    burst(coin.x, coin.y, '#fbbf24');
    updateHUD();
  }

  function burst(x, y, color) {
    for (let i = 0; i < 12; i += 1) {
      particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.8) * 6, life: 1, color });
    }
  }

  function completeRunnerWord() {
    gActive = false;
    if (rAF) cancelAnimationFrame(rAF);
    rAF = null;
    score += WORD_SCORE + streak * 3;
    revealedWord = currentWord();
    completed.push(revealedWord.tamil);
    const progress = getProgress();
    if (!progress.learned.includes(revealedWord.tamil)) progress.learned.push(revealedWord.tamil);
    progress.bestScore = Math.max(progress.bestScore, score);
    saveProgress(progress);
    logEvent('runner_word_complete', {
      level: 1,
      taskType: 'word_collection',
      itemId: revealedWord.id,
      outcome: 'correct',
      score,
      lives: l1Lives,
      durationMs: Math.round(performance.now() - level1StartedAt)
    });
    updateHUD();
    showWordReveal(revealedWord);
  }

  function level1Fail() {
    logEvent('level_fail', { level: 1, taskType: 'runner', outcome: 'out_of_lives', score, lives: 0, durationMs: Math.round(performance.now() - level1StartedAt) });
    $('failTitle').textContent = 'Level 1 – Out of Lives';
    $('failMsg').textContent = 'Keep trying: collect the highlighted letter and switch lanes before obstacles reach you.';
    $('retryBtn').onclick = () => { hideOverlay('levelFailOverlay'); startLevel1(); };
    showOverlay('levelFailOverlay');
  }

  function showWordReveal(word) {
    $('revealIcon').textContent = word.icon;
    $('revealWord').textContent = word.tamil;
    $('revealEnglish').textContent = `${word.english} · ${word.partOfSpeech} · ${word.category}`;
    $('revealMeaning').textContent = `பொருள்: ${word.meaning}`;
    $('revealExample').textContent = `உதாரணம்: ${word.example}`;
    $('revealTiles').innerHTML = '';
    word.letters.forEach((letter) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.textContent = letter;
      $('revealTiles').appendChild(tile);
    });
    showOverlay('revealOverlay');
    speak(word.tamil);
  }

  function continueAfterReveal() {
    safeCancelSpeech();
    hideOverlay('revealOverlay');
    if (completed.length >= WORDS.length) {
      const progress = getProgress();
      progress.levelsComplete[0] = true;
      progress.bestScore = Math.max(progress.bestScore, score);
      saveProgress(progress);
      logEvent('level_complete', { level: 1, taskType: 'runner', outcome: 'complete', score, lives: l1Lives, durationMs: Math.round(performance.now() - level1StartedAt) });
      showLevelWin(1, `You collected all ${WORDS.length} words and unlocked Guided Tracing.`, 2);
    } else {
      wordIdx += 1;
      letterIdx = 0;
      letters = [];
      coins = [];
      obstacles = [];
      gActive = true;
      lastTs = performance.now();
      rAF = requestAnimationFrame(gameLoop);
    }
  }

  function listenRevealLetters() {
    if (!revealedWord) return;
    clearTimers();
    safeCancelSpeech();
    const tiles = [...$('revealTiles').children];
    let index = 0;
    const next = () => {
      tiles.forEach((tile) => tile.classList.remove('active'));
      if (index < revealedWord.letters.length) {
        tiles[index].classList.add('active');
        const letter = revealedWord.letters[index];
        index += 1;
        speak(letter, 0.7, () => later(next, 260));
      } else {
        speak(revealedWord.tamil, 0.75, () => tiles.forEach((tile) => tile.classList.remove('active')));
      }
    };
    next();
  }

  function roundRectPath(context, x, y, width, height, radius) {
    if (typeof context.roundRect === 'function') {
      context.beginPath();
      context.roundRect(x, y, width, height, radius);
      return;
    }
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawBackground() {
    ctx.fillStyle = '#07090f';
    ctx.fillRect(0, 0, CW, CH);
    const gradient = ctx.createLinearGradient(0, 0, 0, CH);
    gradient.addColorStop(0, '#101936');
    gradient.addColorStop(0.55, '#0f172a');
    gradient.addColorStop(1, '#08111f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = 'rgba(167,139,250,.11)';
    for (let x = -bgOff; x < CW + 70; x += BLDG_W) BLDGS.forEach((b) => ctx.fillRect(x + b.x, 110 - b.h, b.w, b.h));
    ctx.fillStyle = 'rgba(52,211,153,.25)';
    for (let x = -midOff; x < CW + 80; x += TREE_W) {
      TREES.forEach((tree) => {
        ctx.fillRect(x + tree.x + Math.floor(tree.w / 2) - 3, 118, 6, 40);
        ctx.beginPath();
        ctx.arc(x + tree.x + tree.w / 2, 115, tree.w / 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.fillStyle = '#101827';
    ctx.fillRect(0, 130, CW, CH - 130);
    LANE_Y.forEach((y) => {
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      ctx.lineWidth = 2;
      ctx.setLineDash([16, 18]);
      ctx.beginPath();
      ctx.moveTo(0, y + 34);
      ctx.lineTo(CW, y + 34);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    for (let x = -fgOff; x < CW; x += 80) {
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fillRect(x, 385, 46, 3);
    }
  }

  function renderGame() {
    drawBackground();
    ctx.save();
    ctx.translate(PLAYER_X, pY);
    ctx.fillStyle = shieldTime > 0 ? '#22d3ee' : '#a78bfa';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏃', 0, 0);
    if (shieldTime > 0) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    letters.forEach((letter) => {
      ctx.save();
      ctx.translate(letter.x, letter.y);
      ctx.fillStyle = letter.isTarget ? 'rgba(251,191,36,.22)' : 'rgba(100,116,139,.22)';
      ctx.beginPath();
      ctx.arc(0, 0, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = letter.isTarget ? letter.color : '#64748b';
      roundRectPath(ctx, -TILE, -TILE, TILE * 2, TILE * 2, 12);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = "900 22px 'Noto Sans Tamil', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter.ch, 0, 2);
      ctx.restore();
    });

    coins.forEach((coin) => {
      ctx.save();
      ctx.translate(coin.x, coin.y);
      ctx.rotate(coin.spin);
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(coin.type === 'star' ? '⭐' : coin.type === 'shield' ? '🛡️' : coin.type === 'magnet' ? '🧲' : '🪙', 0, 0);
      ctx.restore();
    });
    obstacles.forEach((obstacle) => {
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obstacle.type === 'rock' ? '🪨' : '🚧', obstacle.x, obstacle.y);
    });
    particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawPausedOverlay() {
    ctx.fillStyle = 'rgba(7,9,15,.72)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = "900 34px 'Nunito', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Paused', CW / 2, CH / 2 - 12);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = "700 16px 'Nunito', sans-serif";
    ctx.fillText('Press Resume to continue', CW / 2, CH / 2 + 24);
  }

  // ---------------------------------------------------------------------------
  // Level completion overlay
  // ---------------------------------------------------------------------------
  const WIN_ICONS = ['🎉', '🌟', '🏆', '🎓'];
  const WIN_TITLES = ['Words Collected', 'Guided Tracing Complete', 'Sentences Complete', 'Read-Aloud Practice Complete'];

  function showLevelWin(level, message, nextLevel) {
    $('lvlWinIcon').textContent = WIN_ICONS[level - 1];
    $('lvlWinLabel').textContent = `Level ${level} Complete`;
    $('lvlWinTitle').textContent = WIN_TITLES[level - 1];
    $('lvlWinMsg').textContent = message;
    $('nextLevelBtn').textContent = nextLevel <= 4 ? `Level ${nextLevel} →` : '🏆 See Results';
    $('nextLevelBtn').onclick = () => {
      hideOverlay('levelWinOverlay');
      if (nextLevel === 2) startLevel2();
      else if (nextLevel === 3) startLevel3();
      else if (nextLevel === 4) startLevel4();
      else showFinalResults();
    };
    showOverlay('levelWinOverlay');
  }

  // ---------------------------------------------------------------------------
  // Level 2: guided tracing
  // ---------------------------------------------------------------------------
  const traceCanvas = $('traceCanvas');
  const traceContext = traceCanvas.getContext('2d');
  const guideCanvas = document.createElement('canvas');
  guideCanvas.width = traceCanvas.width;
  guideCanvas.height = traceCanvas.height;
  const guideContext = guideCanvas.getContext('2d', { willReadFrequently: true });
  const TRACE_GRID = 12;
  let guideImageData = null;
  let guideCells = new Set();
  let traceState = createTraceState();

  function createTraceState() {
    return {
      wordIdx: 0,
      letterIdx: 0,
      drawing: false,
      last: null,
      pathLength: 0,
      totalSamples: 0,
      onGuideSamples: 0,
      strokeCells: new Set(),
      touchedGuideCells: new Set(),
      lives: MAX_LIVES,
      skipped: 0,
      acceptedLetters: 0,
      fullyTracedWords: 0,
      wordHadSkip: false,
      attempts: 0,
      itemStartedAt: 0,
      levelStartedAt: 0
    };
  }

  function startLevel2() {
    traceState = createTraceState();
    traceState.levelStartedAt = performance.now();
    show('traceScreen');
    renderLives('traceLivesRow', traceState.lives);
    logEvent('level_start', { level: 2, taskType: 'guided_tracing' });
    const fontReady = document.fonts?.ready || Promise.resolve();
    Promise.race([fontReady, new Promise((resolve) => window.setTimeout(resolve, 1200))])
      .then(setupTraceLetter, setupTraceLetter);
  }

  function drawGuideLetter(context, character, opaque = false) {
    context.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
    if (!opaque) {
      context.fillStyle = '#fff7ed';
      context.fillRect(0, 0, traceCanvas.width, traceCanvas.height);
      context.fillStyle = 'rgba(124,58,237,.17)';
    } else {
      context.fillStyle = '#000';
    }
    context.font = "900 170px 'Noto Sans Tamil', sans-serif";
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(character, traceCanvas.width / 2, traceCanvas.height / 2 + 5);
  }

  function buildGuideMask(character) {
    drawGuideLetter(guideContext, character, true);
    guideImageData = guideContext.getImageData(0, 0, guideCanvas.width, guideCanvas.height);
    guideCells = new Set();
    for (let y = 0; y < guideCanvas.height; y += TRACE_GRID) {
      for (let x = 0; x < guideCanvas.width; x += TRACE_GRID) {
        if (maskAt(x + TRACE_GRID / 2, y + TRACE_GRID / 2, 6)) {
          guideCells.add(`${Math.floor(x / TRACE_GRID)}:${Math.floor(y / TRACE_GRID)}`);
        }
      }
    }
  }

  function setupTraceLetter() {
    const word = WORDS[traceState.wordIdx];
    const character = word.letters[traceState.letterIdx];
    traceState.drawing = false;
    traceState.last = null;
    traceState.pathLength = 0;
    traceState.totalSamples = 0;
    traceState.onGuideSamples = 0;
    traceState.strokeCells = new Set();
    traceState.touchedGuideCells = new Set();
    traceState.attempts = 0;
    traceState.itemStartedAt = performance.now();

    $('traceWord').textContent = word.tamil;
    $('traceLetter').textContent = character;
    $('traceProgress').innerHTML = '';
    word.letters.forEach((letter, i) => {
      const tile = document.createElement('div');
      tile.className = `tile${i < traceState.letterIdx ? ' completed' : i === traceState.letterIdx ? ' active' : ''}`;
      tile.textContent = letter;
      $('traceProgress').appendChild(tile);
    });
    drawGuideLetter(traceContext, character, false);
    buildGuideMask(character);
    $('traceFeedback').textContent = 'Trace the guide, then tap Check Trace.';
    $('traceFeedback').className = 'trace-feedback';
    renderTraceMetrics();
    speak(character, 0.72);
  }

  function maskAt(x, y, radius = 4) {
    if (!guideImageData) return false;
    const width = guideImageData.width;
    const height = guideImageData.height;
    const minX = Math.max(0, Math.floor(x - radius));
    const maxX = Math.min(width - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius));
    const maxY = Math.min(height - 1, Math.ceil(y + radius));
    for (let py = minY; py <= maxY; py += 2) {
      for (let px = minX; px <= maxX; px += 2) {
        if (guideImageData.data[(py * width + px) * 4 + 3] > 30) return true;
      }
    }
    return false;
  }

  function sampleTraceSegment(from, to) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    traceState.pathLength += distance;
    const steps = Math.max(1, Math.ceil(distance / 4));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      traceState.totalSamples += 1;
      const gridKey = `${Math.floor(x / TRACE_GRID)}:${Math.floor(y / TRACE_GRID)}`;
      traceState.strokeCells.add(gridKey);
      if (maskAt(x, y, 7)) {
        traceState.onGuideSamples += 1;
        traceState.touchedGuideCells.add(gridKey);
      }
    }
  }

  function traceRatios() {
    return {
      onGuide: traceState.totalSamples ? traceState.onGuideSamples / traceState.totalSamples : 0,
      coverage: guideCells.size ? traceState.touchedGuideCells.size / guideCells.size : 0
    };
  }

  function renderTraceMetrics() {
    const ratios = traceRatios();
    $('traceMetrics').textContent = `On-guide: ${Math.round(ratios.onGuide * 100)}% · Coverage: ${Math.round(ratios.coverage * 100)}%`;
  }

  function tracePointerDown(event) {
    event.preventDefault();
    const point = traceCoordinates(event);
    traceState.drawing = true;
    traceState.last = point;
    try { traceCanvas.setPointerCapture(event.pointerId); } catch (_) { /* no-op */ }
    traceContext.strokeStyle = '#7c3aed';
    traceContext.lineWidth = 12;
    traceContext.lineCap = 'round';
    traceContext.beginPath();
    traceContext.moveTo(point.x, point.y);
    traceContext.lineTo(point.x + 0.1, point.y + 0.1);
    traceContext.stroke();
    sampleTraceSegment(point, { x: point.x + 0.1, y: point.y + 0.1 });
    renderTraceMetrics();
  }

  function tracePointerMove(event) {
    if (!traceState.drawing) return;
    event.preventDefault();
    const point = traceCoordinates(event);
    traceContext.strokeStyle = '#7c3aed';
    traceContext.lineWidth = 12;
    traceContext.lineCap = 'round';
    traceContext.beginPath();
    traceContext.moveTo(traceState.last.x, traceState.last.y);
    traceContext.lineTo(point.x, point.y);
    traceContext.stroke();
    sampleTraceSegment(traceState.last, point);
    traceState.last = point;
    renderTraceMetrics();
  }

  function tracePointerUp(event) {
    traceState.drawing = false;
    try { traceCanvas.releasePointerCapture(event.pointerId); } catch (_) { /* no-op */ }
  }

  function traceCoordinates(event) {
    const rect = traceCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (traceCanvas.width / rect.width),
      y: (event.clientY - rect.top) * (traceCanvas.height / rect.height)
    };
  }

  function checkTrace() {
    traceState.attempts += 1;
    const ratios = traceRatios();
    const hasEnoughMovement = traceState.pathLength >= 115;
    const followsGuide = ratios.onGuide >= 0.46;
    const coversShape = ratios.coverage >= 0.055;
    const reachesEnoughAreas = traceState.strokeCells.size >= 10;
    const accepted = hasEnoughMovement && followsGuide && coversShape && reachesEnoughAreas;
    const word = WORDS[traceState.wordIdx];
    const character = word.letters[traceState.letterIdx];

    logEvent('trace_check', {
      level: 2,
      taskType: 'guided_tracing',
      itemId: word.id,
      outcome: accepted ? 'accepted' : 'retry',
      attempt: traceState.attempts,
      durationMs: Math.round(performance.now() - traceState.itemStartedAt),
      score: Math.round(ratios.onGuide * 100),
      confidence: Math.round(ratios.coverage * 100),
      reason: character,
      lives: traceState.lives
    });

    if (!accepted) {
      const suggestions = [];
      if (!hasEnoughMovement || !reachesEnoughAreas) suggestions.push('trace more of the shape');
      if (!followsGuide) suggestions.push('keep the line closer to the guide');
      if (!coversShape) suggestions.push('reach more parts of the letter');
      $('traceFeedback').textContent = `Try again: ${suggestions.join(' and ')}.`;
      $('traceFeedback').className = 'trace-feedback bad';
      return;
    }

    $('traceFeedback').textContent = '✓ Guide followed. Good practice!';
    $('traceFeedback').className = 'trace-feedback good';
    traceState.acceptedLetters += 1;
    completeTraceItem(false);
  }

  function skipTraceLetter() {
    const word = WORDS[traceState.wordIdx];
    const character = word.letters[traceState.letterIdx];
    traceState.lives -= 1;
    traceState.skipped += 1;
    traceState.wordHadSkip = true;
    renderLives('traceLivesRow', traceState.lives);
    toast('Letter skipped −❤️');
    logEvent('trace_skip', { level: 2, taskType: 'guided_tracing', itemId: word.id, outcome: 'skipped', reason: character, lives: traceState.lives, skips: traceState.skipped });
    if (traceState.lives <= 0) {
      logEvent('level_fail', { level: 2, taskType: 'guided_tracing', outcome: 'out_of_lives', lives: 0, skips: traceState.skipped, durationMs: Math.round(performance.now() - traceState.levelStartedAt) });
      $('failTitle').textContent = 'Level 2 – Out of Lives';
      $('failMsg').textContent = 'Follow the pale guide slowly. Clear the canvas and retry as often as needed before using Skip.';
      $('retryBtn').onclick = () => { hideOverlay('levelFailOverlay'); startLevel2(); };
      showOverlay('levelFailOverlay');
      return;
    }
    completeTraceItem(true);
  }

  function completeTraceItem(skipped) {
    traceState.letterIdx += 1;
    const word = WORDS[traceState.wordIdx];
    if (traceState.letterIdx >= word.letters.length) {
      if (!traceState.wordHadSkip) traceState.fullyTracedWords += 1;
      traceState.letterIdx = 0;
      traceState.wordIdx += 1;
      traceState.wordHadSkip = false;
      if (traceState.wordIdx >= WORDS.length) {
        const progress = getProgress();
        progress.levelsComplete[1] = true;
        progress.tracedWords += traceState.fullyTracedWords;
        progress.tracedLetters += traceState.acceptedLetters;
        saveProgress(progress);
        logEvent('level_complete', {
          level: 2,
          taskType: 'guided_tracing',
          outcome: 'complete',
          lives: traceState.lives,
          skips: traceState.skipped,
          score: traceState.acceptedLetters,
          durationMs: Math.round(performance.now() - traceState.levelStartedAt)
        });
        showLevelWin(2, `Guided tracing finished: ${traceState.acceptedLetters} letters followed and ${traceState.skipped} skipped.`, 3);
        return;
      }
      if (!skipped) toast('Word traced ✓');
    }
    later(setupTraceLetter, 260);
  }

  // ---------------------------------------------------------------------------
  // Level 3: sentence fill
  // ---------------------------------------------------------------------------
  let sentenceState = createSentenceState();
  function createSentenceState() {
    return { idx: 0, lives: MAX_LIVES, attempts: 0, replays: 0, itemStartedAt: 0, levelStartedAt: 0 };
  }

  function startLevel3() {
    sentenceState = createSentenceState();
    sentenceState.levelStartedAt = performance.now();
    show('sentenceScreen');
    renderLives('sentLivesRow', sentenceState.lives);
    renderDots('sentenceDots', WORDS.length, 0);
    logEvent('level_start', { level: 3, taskType: 'sentence_fill' });
    showSentence();
  }

  function setSentenceWithBlank(word) {
    const [before, after] = word.sentence.split('___');
    const holder = $('sentenceText');
    holder.innerHTML = '';
    holder.appendChild(document.createTextNode(before));
    const blank = document.createElement('span');
    blank.className = 'sentence-blank';
    blank.id = 'sentBlank';
    blank.textContent = '___';
    holder.appendChild(blank);
    holder.appendChild(document.createTextNode(after));
  }

  function showSentence() {
    const word = WORDS[sentenceState.idx];
    sentenceState.attempts = 0;
    sentenceState.replays = 0;
    sentenceState.itemStartedAt = performance.now();
    renderDots('sentenceDots', WORDS.length, sentenceState.idx);
    setSentenceWithBlank(word);
    $('sentenceEn').textContent = word.sentenceEn;
    $('sentFeedback').textContent = '';
    $('sentFeedback').style.color = '';
    const options = shuffle([word.tamil, ...word.distractors.slice(0, 3)]);
    $('wordOptions').innerHTML = '';
    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'word-option';
      button.textContent = option;
      button.addEventListener('click', () => answerSentence(button, option, word));
      $('wordOptions').appendChild(button);
    });
  }

  function listenSentence() {
    const word = WORDS[sentenceState.idx];
    sentenceState.replays += 1;
    speak(word.sentence.replace('___', word.tamil), 0.7);
    logEvent('audio_replay', { level: 3, taskType: 'sentence_fill', itemId: word.id, outcome: 'played', replays: sentenceState.replays, lives: sentenceState.lives });
  }

  function answerSentence(button, chosen, word) {
    sentenceState.attempts += 1;
    [...$('wordOptions').children].forEach((item) => { item.disabled = true; });
    const correct = chosen === word.tamil;
    logEvent('sentence_answer', {
      level: 3,
      taskType: 'sentence_fill',
      itemId: word.id,
      outcome: correct ? 'correct' : 'incorrect',
      attempt: sentenceState.attempts,
      durationMs: Math.round(performance.now() - sentenceState.itemStartedAt),
      replays: sentenceState.replays,
      lives: sentenceState.lives
    });

    if (correct) {
      button.classList.add('correct');
      $('sentBlank').textContent = word.tamil;
      $('sentBlank').style.color = 'var(--green)';
      $('sentFeedback').textContent = word.feedback.correct;
      $('sentFeedback').style.color = '#86efac';
      later(() => {
        sentenceState.idx += 1;
        if (sentenceState.idx >= WORDS.length) {
          const progress = getProgress();
          progress.levelsComplete[2] = true;
          saveProgress(progress);
          logEvent('level_complete', { level: 3, taskType: 'sentence_fill', outcome: 'complete', lives: sentenceState.lives, durationMs: Math.round(performance.now() - sentenceState.levelStartedAt) });
          showLevelWin(3, `You completed all ${WORDS.length} sentence items.`, 4);
        } else showSentence();
      }, 850);
      return;
    }

    button.classList.add('wrong');
    $('sentFeedback').textContent = `Try again. Hint: ${word.feedback.hint}`;
    $('sentFeedback').style.color = '#fda4af';
    sentenceState.lives -= 1;
    renderLives('sentLivesRow', sentenceState.lives);
    if (sentenceState.lives <= 0) {
      later(() => {
        logEvent('level_fail', { level: 3, taskType: 'sentence_fill', outcome: 'out_of_lives', lives: 0, durationMs: Math.round(performance.now() - sentenceState.levelStartedAt) });
        $('failTitle').textContent = 'Level 3 – Out of Lives';
        $('failMsg').textContent = 'Read the full sentence and use the English support before choosing a word.';
        $('retryBtn').onclick = () => { hideOverlay('levelFailOverlay'); startLevel3(); };
        showOverlay('levelFailOverlay');
      }, 550);
      return;
    }
    later(() => {
      [...$('wordOptions').children].forEach((item) => { item.disabled = false; item.classList.remove('wrong'); });
      $('sentFeedback').textContent = '';
    }, 850);
  }

  // ---------------------------------------------------------------------------
  // Level 4: read aloud with optional Web Speech API checking
  // ---------------------------------------------------------------------------
  const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let readState = createReadState();
  function createReadState() {
    return {
      idx: 0,
      lives: MAX_LIVES,
      listened: false,
      attempts: 0,
      failedChecks: 0,
      replays: 0,
      skips: 0,
      recognized: 0,
      manual: 0,
      itemStartedAt: 0,
      levelStartedAt: 0,
      receivedResult: false
    };
  }

  function recognitionAvailable() {
    return Boolean(SpeechRecognitionConstructor && window.isSecureContext);
  }

  function startLevel4() {
    readState = createReadState();
    readState.levelStartedAt = performance.now();
    show('readScreen');
    renderLives('readLivesRow', readState.lives);
    renderDots('readDots', WORDS.length, 0);
    logEvent('level_start', { level: 4, taskType: 'read_aloud', reason: recognitionAvailable() ? 'speech_check_available' : 'manual_fallback' });
    showReadSlide();
  }

  function setReadSentence(word) {
    const full = word.sentence.replace('___', word.tamil);
    const index = full.indexOf(word.tamil);
    const holder = $('readSentence');
    holder.innerHTML = '';
    if (index < 0) {
      holder.textContent = full;
      return;
    }
    holder.appendChild(document.createTextNode(full.slice(0, index)));
    const highlighted = document.createElement('span');
    highlighted.className = 'hl';
    highlighted.textContent = word.tamil;
    holder.appendChild(highlighted);
    holder.appendChild(document.createTextNode(full.slice(index + word.tamil.length)));
  }

  function showReadSlide() {
    stopRecognition();
    const word = WORDS[readState.idx];
    readState.listened = false;
    readState.attempts = 0;
    readState.failedChecks = 0;
    readState.replays = 0;
    readState.receivedResult = false;
    readState.itemStartedAt = performance.now();
    renderDots('readDots', WORDS.length, readState.idx);
    setReadSentence(word);
    $('readEn').textContent = word.sentenceEn.replace('___', word.english);
    $('readStatus').textContent = 'Press Listen to hear the sentence first.';
    $('readStatus').className = 'read-status';
    $('transcriptPreview').hidden = true;
    $('transcriptPreview').textContent = '';
    $('speakCheckBtn').disabled = true;
    $('speakCheckBtn').hidden = !recognitionAvailable();
    $('manualReadBtn').hidden = recognitionAvailable();
    $('manualReadBtn').disabled = true;
  }

  function listenRead() {
    const word = WORDS[readState.idx];
    readState.listened = true;
    readState.replays += 1;
    speak(word.sentence.replace('___', word.tamil), 0.66);
    if (recognitionAvailable()) {
      $('readStatus').textContent = 'Now read the sentence aloud, then press Speak & Check.';
      $('readStatus').className = 'read-status listening';
      $('speakCheckBtn').disabled = false;
    } else {
      $('readStatus').textContent = 'Speech checking is unavailable here. Read aloud, then confirm your practice.';
      $('readStatus').className = 'read-status listening';
      $('manualReadBtn').hidden = false;
      $('manualReadBtn').disabled = false;
    }
    logEvent('audio_replay', { level: 4, taskType: 'read_aloud', itemId: word.id, outcome: 'played', replays: readState.replays, lives: readState.lives });
  }

  function normalizeSpeech(text) {
    return String(text || '')
      .normalize('NFKC')
      .toLocaleLowerCase('ta')
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, '');
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    const current = new Array(b.length + 1);
    for (let i = 1; i <= a.length; i += 1) {
      current[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
    }
    return previous[b.length];
  }

  function speechSimilarity(transcript, expected) {
    const a = normalizeSpeech(transcript);
    const b = normalizeSpeech(expected);
    if (!a || !b) return 0;
    return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  }

  function bestSpeechMatch(alternatives, word) {
    const expected = [word.sentence.replace('___', word.tamil), ...word.acceptedSpeechVariants];
    let best = { transcript: '', confidence: null, similarity: 0 };
    alternatives.forEach((alternative) => {
      expected.forEach((target) => {
        const similarity = speechSimilarity(alternative.transcript, target);
        if (similarity > best.similarity) best = { ...alternative, similarity };
      });
    });
    return best;
  }

  function startSpeechCheck() {
    if (!readState.listened) { toast('Please listen first.'); return; }
    if (!recognitionAvailable()) {
      $('manualReadBtn').hidden = false;
      $('manualReadBtn').disabled = false;
      return;
    }
    stopRecognition();
    const word = WORDS[readState.idx];
    readState.attempts += 1;
    readState.receivedResult = false;
    $('speakCheckBtn').disabled = true;
    $('readStatus').textContent = 'Listening… read the full sentence now.';
    $('readStatus').className = 'read-status listening';
    $('transcriptPreview').hidden = true;

    const recognition = new SpeechRecognitionConstructor();
    activeRecognition = recognition;
    recognition.lang = 'ta-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      readState.receivedResult = true;
      const alternatives = [];
      for (let i = 0; i < event.results[0].length; i += 1) {
        alternatives.push({
          transcript: event.results[0][i].transcript || '',
          confidence: Number.isFinite(event.results[0][i].confidence) ? event.results[0][i].confidence : null
        });
      }
      const match = bestSpeechMatch(alternatives, word);
      const accepted = match.similarity >= 0.72;
      $('transcriptPreview').hidden = false;
      $('transcriptPreview').textContent = `Heard: ${match.transcript || 'No clear transcript'} · Match: ${Math.round(match.similarity * 100)}%`;
      logEvent('speech_check', {
        level: 4,
        taskType: 'read_aloud',
        itemId: word.id,
        outcome: accepted ? 'recognized' : 'retry',
        attempt: readState.attempts,
        durationMs: Math.round(performance.now() - readState.itemStartedAt),
        confidence: match.confidence === null ? '' : Math.round(match.confidence * 100),
        similarity: Math.round(match.similarity * 100),
        replays: readState.replays,
        lives: readState.lives
      });
      if (accepted) {
        readState.recognized += 1;
        $('readStatus').textContent = 'Speech check matched. Well done!';
        $('readStatus').className = 'read-status ready';
        completeReadItem('recognized');
      } else {
        readState.failedChecks += 1;
        $('readStatus').textContent = 'The match was uncertain. Listen and try again slowly.';
        $('readStatus').className = 'read-status bad';
        $('speakCheckBtn').disabled = false;
        if (readState.failedChecks >= 2) {
          $('manualReadBtn').hidden = false;
          $('manualReadBtn').disabled = false;
          $('readStatus').textContent += ' You may also confirm that you completed the practice.';
        }
      }
    };

    recognition.onerror = (event) => {
      const reason = event.error || 'recognition_error';
      logEvent('speech_error', { level: 4, taskType: 'read_aloud', itemId: word.id, outcome: 'fallback', attempt: readState.attempts, reason, lives: readState.lives });
      $('readStatus').textContent = 'Speech checking could not complete. You may retry or confirm the practice manually.';
      $('readStatus').className = 'read-status bad';
      $('speakCheckBtn').disabled = false;
      $('manualReadBtn').hidden = false;
      $('manualReadBtn').disabled = false;
    };

    recognition.onend = () => {
      activeRecognition = null;
      if (!readState.receivedResult && $('readScreen').classList.contains('active')) {
        $('speakCheckBtn').disabled = false;
      }
    };

    try {
      recognition.start();
    } catch (error) {
      activeRecognition = null;
      $('readStatus').textContent = 'Speech checking could not start. Use the clearly labelled practice confirmation.';
      $('readStatus').className = 'read-status bad';
      $('manualReadBtn').hidden = false;
      $('manualReadBtn').disabled = false;
      logEvent('speech_error', { level: 4, taskType: 'read_aloud', itemId: word.id, outcome: 'fallback', reason: error.name || 'start_error', lives: readState.lives });
    }
  }

  function manualReadConfirmation() {
    if (!readState.listened) { toast('Please listen first.'); return; }
    const word = WORDS[readState.idx];
    readState.manual += 1;
    logEvent('speech_practice', {
      level: 4,
      taskType: 'read_aloud',
      itemId: word.id,
      outcome: 'self_confirmed',
      attempt: Math.max(1, readState.attempts),
      durationMs: Math.round(performance.now() - readState.itemStartedAt),
      replays: readState.replays,
      lives: readState.lives
    });
    $('readStatus').textContent = 'Practice recorded as self-confirmed.';
    $('readStatus').className = 'read-status ready';
    completeReadItem('self_confirmed');
  }

  function completeReadItem(method) {
    stopRecognition();
    $('speakCheckBtn').disabled = true;
    $('manualReadBtn').disabled = true;
    const progress = getProgress();
    progress.spokenPractice += 1;
    if (method === 'recognized') progress.speechRecognized += 1;
    else progress.manualSpeechConfirmations += 1;
    saveProgress(progress);
    later(() => {
      readState.idx += 1;
      if (readState.idx >= WORDS.length) finishLevel4();
      else showReadSlide();
    }, 800);
  }

  function skipRead() {
    stopRecognition();
    const word = WORDS[readState.idx];
    readState.lives -= 1;
    readState.skips += 1;
    renderLives('readLivesRow', readState.lives);
    toast('Skipped −❤️');
    logEvent('speech_skip', { level: 4, taskType: 'read_aloud', itemId: word.id, outcome: 'skipped', lives: readState.lives, skips: readState.skips });
    if (readState.lives <= 0) {
      logEvent('level_fail', { level: 4, taskType: 'read_aloud', outcome: 'out_of_lives', lives: 0, skips: readState.skips, durationMs: Math.round(performance.now() - readState.levelStartedAt) });
      $('failTitle').textContent = 'Level 4 – Out of Lives';
      $('failMsg').textContent = 'Listen first, then read aloud. Speech checking is optional; the manual practice confirmation is available when needed.';
      $('retryBtn').onclick = () => { hideOverlay('levelFailOverlay'); startLevel4(); };
      showOverlay('levelFailOverlay');
      return;
    }
    readState.idx += 1;
    if (readState.idx >= WORDS.length) finishLevel4();
    else showReadSlide();
  }

  function finishLevel4() {
    const progress = getProgress();
    progress.levelsComplete[3] = true;
    saveProgress(progress);
    logEvent('level_complete', {
      level: 4,
      taskType: 'read_aloud',
      outcome: 'complete',
      lives: readState.lives,
      score: readState.recognized,
      skips: readState.skips,
      reason: `${readState.recognized} recognized; ${readState.manual} self-confirmed`,
      durationMs: Math.round(performance.now() - readState.levelStartedAt)
    });
    showLevelWin(4, `Read-aloud practice finished: ${readState.recognized} speech checks matched, ${readState.manual} self-confirmed, and ${readState.skips} skipped.`, 5);
  }

  // ---------------------------------------------------------------------------
  // Results, passport and evaluation data
  // ---------------------------------------------------------------------------
  function showFinalResults() {
    const progress = getProgress();
    const completedLevels = progress.levelsComplete.filter(Boolean).length;
    const stars = completedLevels >= 4 ? 3 : completedLevels >= 2 ? 2 : 1;
    progress.stars = Math.max(progress.stars, stars);
    progress.bestScore = Math.max(progress.bestScore, score);
    saveProgress(progress);
    show('resultsScreen');
    $('starsRow').innerHTML = Array.from({ length: stars }, () => '<div class="star-item">⭐</div>').join('');
    $('finalScore').textContent = String(progress.bestScore);
    const stats = [
      ['Words Learned', `${progress.learned.length}/${WORDS.length}`],
      ['Best Runner Score', progress.bestScore],
      ['Levels Complete', `${completedLevels}/4`],
      ['Stars Earned', '⭐'.repeat(progress.stars) || '—'],
      ['Guided Letters', progress.tracedLetters],
      ['Read-Aloud Practices', progress.spokenPractice]
    ];
    $('resultsGrid').innerHTML = stats.map(([label, value]) => `<div class="stat"><strong>${label}</strong><span>${value}</span></div>`).join('');
    logEvent('results_view', { outcome: 'viewed', score: progress.bestScore, reason: `${completedLevels}/4 levels` });
    speak('நன்றி! வாழ்த்துகள்!', 0.72);
  }

  function openPassport() {
    const progress = getProgress();
    $('passportStats').textContent = `Learned ${progress.learned.length}/${WORDS.length} · Best score ${progress.bestScore} · Levels ${progress.levelsComplete.filter(Boolean).length}/4 · Stars ${'⭐'.repeat(progress.stars) || '—'}`;
    $('passportList').innerHTML = '';
    WORDS.forEach((word, index) => {
      const unlocked = progress.learned.includes(word.tamil);
      const card = document.createElement('article');
      card.className = 'word-card';
      if (unlocked) {
        const title = document.createElement('strong');
        title.textContent = `${word.icon} ${word.tamil}`;
        const meta = document.createElement('p');
        meta.innerHTML = `<b>${word.english}</b> · ${word.partOfSpeech} · ${word.category} · Difficulty ${word.difficulty}`;
        const meaning = document.createElement('p');
        meaning.textContent = word.meaning;
        const example = document.createElement('p');
        example.style.color = 'var(--green)';
        example.textContent = word.example;
        card.append(title, meta, meaning, example);
      } else {
        card.innerHTML = `<strong>🔒 Word ${index + 1}</strong><p>Complete Level 1 to unlock this entry.</p>`;
      }
      $('passportList').appendChild(card);
    });
    show('passportScreen');
  }

  function renderDataScreen() {
    const settings = loadSettings();
    const logs = loadLogs();
    $('participantCode').value = settings.participantCode || '';
    const sessions = new Set(logs.map((entry) => entry.sessionId)).size;
    const completedTasks = logs.filter((entry) => ['correct', 'accepted', 'recognized', 'self_confirmed', 'complete'].includes(entry.outcome)).length;
    $('dataStats').innerHTML = [
      ['Events', logs.length],
      ['Sessions', sessions],
      ['Completed outcomes', completedTasks]
    ].map(([label, value]) => `<div class="data-stat"><strong>${label}</strong><span>${value}</span></div>`).join('');
    show('dataScreen');
  }

  function saveParticipantCode() {
    const sanitized = $('participantCode').value.trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24);
    const settings = loadSettings();
    settings.participantCode = sanitized || generateParticipantCode();
    saveSettings(settings);
    $('participantCode').value = settings.participantCode;
  }

  function returnHome() {
    stopRunner(true);
    stopRecognition();
    safeCancelSpeech();
    clearTimers();
    MODAL_OVERLAYS.forEach((id) => $(id).classList.remove('active'));
    renderHub();
    show('hubScreen');
  }

  function moveLane(direction) {
    if (!gActive || gPaused) return;
    pTargetLane = Math.max(0, Math.min(2, pTargetLane + direction));
  }

  // ---------------------------------------------------------------------------
  // Event listeners
  // ---------------------------------------------------------------------------
  function bindEvents() {
    $('passportBtn').addEventListener('click', openPassport);
    $('dataBtn').addEventListener('click', renderDataScreen);
    $('guideBtn').addEventListener('click', () => show('guideScreen'));
    $('endBtn').addEventListener('click', returnHome);
    $('pauseBtn').addEventListener('click', togglePause);
    $('upBtn').addEventListener('click', () => moveLane(-1));
    $('downBtn').addEventListener('click', () => moveLane(1));
    $('listenLettersBtn').addEventListener('click', listenRevealLetters);
    $('listenWordBtn').addEventListener('click', () => { if (revealedWord) speak(revealedWord.tamil); });
    $('continueBtn').addEventListener('click', continueAfterReveal);

    traceCanvas.addEventListener('pointerdown', tracePointerDown);
    traceCanvas.addEventListener('pointermove', tracePointerMove);
    traceCanvas.addEventListener('pointerup', tracePointerUp);
    traceCanvas.addEventListener('pointercancel', tracePointerUp);
    $('clearTraceBtn').addEventListener('click', setupTraceLetter);
    $('finishTraceBtn').addEventListener('click', checkTrace);
    $('skipTraceLetterBtn').addEventListener('click', skipTraceLetter);
    $('backFromTraceBtn').addEventListener('click', returnHome);

    $('listenSentenceBtn').addEventListener('click', listenSentence);
    $('backFromSentBtn').addEventListener('click', returnHome);

    $('listenReadBtn').addEventListener('click', listenRead);
    $('speakCheckBtn').addEventListener('click', startSpeechCheck);
    $('manualReadBtn').addEventListener('click', manualReadConfirmation);
    $('skipReadBtn').addEventListener('click', skipRead);
    $('backFromReadBtn').addEventListener('click', returnHome);

    $('playAgainBtn').addEventListener('click', returnHome);
    document.querySelectorAll('.homeReturn').forEach((button) => button.addEventListener('click', returnHome));

    $('resetProgressBtn').addEventListener('click', () => {
      confirmAction('Reset learning progress?', 'This removes level completion, learned words and scores from this browser. Evaluation logs are kept separately.', 'Reset Progress', () => {
        window.localStorage.removeItem(PROGRESS_KEY);
        LEGACY_PROGRESS_KEYS.forEach((key) => window.localStorage.removeItem(key));
        logEvent('progress_reset', { outcome: 'confirmed' });
        hideOverlay('confirmOverlay');
        renderHub();
        openPassport();
      });
    });

    $('participantCode').addEventListener('change', saveParticipantCode);
    $('newParticipantCodeBtn').addEventListener('click', () => {
      const settings = loadSettings();
      settings.participantCode = generateParticipantCode();
      saveSettings(settings);
      $('participantCode').value = settings.participantCode;
      toast('New anonymous code generated.');
    });
    $('exportCsvBtn').addEventListener('click', exportCsv);
    $('exportJsonBtn').addEventListener('click', exportJson);
    $('clearLogsBtn').addEventListener('click', () => {
      confirmAction('Clear evaluation data?', 'This permanently removes locally stored event logs. Export them first if they are needed for analysis.', 'Clear Data', () => {
        window.localStorage.removeItem(LOG_KEY);
        hideOverlay('confirmOverlay');
        renderDataScreen();
      });
    });
    $('confirmYesBtn').addEventListener('click', () => { if (confirmCallback) confirmCallback(); });
    $('confirmNoBtn').addEventListener('click', () => { confirmCallback = null; hideOverlay('confirmOverlay'); });

    const held = {};
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if ($('confirmOverlay').classList.contains('active')) hideOverlay('confirmOverlay');
        else if ($('revealOverlay').classList.contains('active')) return;
        else if (!$('hubScreen').classList.contains('active')) returnHome();
        return;
      }
      if (held[event.code]) return;
      held[event.code] = true;
      if (!gActive || gPaused) return;
      if (event.code === 'ArrowUp' || event.code === 'KeyW') { event.preventDefault(); moveLane(-1); }
      if (event.code === 'ArrowDown' || event.code === 'KeyS') { event.preventDefault(); moveLane(1); }
      if (event.code === 'Space') { event.preventDefault(); togglePause(); }
    });
    window.addEventListener('keyup', (event) => { held[event.code] = false; });

    let touchY = null;
    canvas.addEventListener('touchstart', (event) => {
      touchY = event.touches[0].clientY;
      event.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', (event) => {
      if (touchY === null) return;
      const delta = event.changedTouches[0].clientY - touchY;
      touchY = null;
      if (gActive && !gPaused && Math.abs(delta) > 20) moveLane(delta > 0 ? 1 : -1);
      event.preventDefault();
    }, { passive: false });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && gActive && !gPaused) pauseRunner('page_hidden');
    });
    window.addEventListener('pagehide', () => logEvent('session_end', { outcome: 'pagehide', score }));
  }

  function initialize() {
    const errors = validateWordBank();
    if (errors.length) {
      $('fatalMessage').textContent = errors.map((error, i) => `${i + 1}. ${error}`).join('\n');
      showOverlay('fatalOverlay');
      return;
    }
    $('versionLabel').textContent = APP_VERSION;
    bindEvents();
    renderHub();
    logEvent('app_open', { outcome: 'ready', reason: `word_count_${WORDS.length}` });

    const debugEnabled = new URLSearchParams(window.location.search).has('debug');
    if (debugEnabled) {
      window.__SOL_DEBUG__ = {
        WORDS,
        validateWordBank,
        startLevel1,
        startLevel2,
        startLevel3,
        startLevel4,
        continueAfterReveal,
        completeRunnerWord,
        checkTrace,
        setupTraceLetter,
        forceValidTrace() {
          traceState.pathLength = 500;
          traceState.totalSamples = 100;
          traceState.onGuideSamples = 85;
          traceState.strokeCells = new Set(Array.from({ length: 25 }, (_, i) => `s${i}`));
          traceState.touchedGuideCells = new Set([...guideCells].slice(0, Math.max(12, Math.ceil(guideCells.size * 0.12))));
          renderTraceMetrics();
        },
        answerSentenceByText(text) {
          const button = [...$('wordOptions').children].find((item) => item.textContent === text);
          button?.click();
        },
        listenRead,
        manualReadConfirmation,
        completeReadForTest() {
          readState.listened = true;
          manualReadConfirmation();
        },
        getState() {
          return {
            progress: getProgress(),
            logs: loadLogs(),
            runner: { wordIdx, letterIdx, completed: [...completed], score, lives: l1Lives },
            trace: { wordIdx: traceState.wordIdx, letterIdx: traceState.letterIdx, lives: traceState.lives },
            sentence: { ...sentenceState },
            read: { ...readState }
          };
        }
      };
    }
  }

  initialize();
})();
