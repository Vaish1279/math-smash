(() => {
  "use strict";
  const STORAGE_KEY = "mathSmash_local_v4";
  const TOTAL_LEVELS = 10000;
  const QUESTIONS_PER_LEVEL = 5;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const $ = id => document.getElementById(id);
  const OPS = { "+": "ADDITION", "-": "SUBTRACTION", "*": "MULTIPLICATION", "/": "DIVISION" };
  const state = {
    op: "+", theme: "classic", progress: { "+": 1, "-": 1, "*": 1, "/": 1 },
    completed: {}, score: 0, smashes: 0, streak: 0, bestStreak: 0,
    hints: 2, hintRefillAt: 0, sound: true, game: null, audio: null
  };
  let levelWindow = 1;
  let installPrompt = null;

  function safeSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        progress: state.progress, completed: state.completed, score: state.score,
        smashes: state.smashes, streak: state.streak, bestStreak: state.bestStreak,
        hints: state.hints, hintRefillAt: state.hintRefillAt, sound: state.sound, theme: state.theme
      }));
    } catch (error) { console.warn("Math Smash could not save local progress:", error); }
  }
  function loadState() {
    try {
      const currentSaved = localStorage.getItem(STORAGE_KEY);
      const saved = JSON.parse(currentSaved || localStorage.getItem("mathSmash_v2") || "{}");
      if (saved.progress && typeof saved.progress === "object") state.progress = { ...state.progress, ...saved.progress };
      else if (Number.isFinite(saved.level)) state.progress["+"] = saved.level;
      state.completed = saved.completed && typeof saved.completed === "object" ? saved.completed : {};
      state.score = Number(saved.score) || 0;
      state.smashes = Number(saved.smashes) || 0;
      state.streak = Number(saved.streak) || 0;
      state.bestStreak = Number(saved.bestStreak) || 0;
      state.hints = Number.isInteger(saved.hints) ? Math.max(0, Math.min(2, saved.hints)) : 2;
      state.hintRefillAt = Number(saved.hintRefillAt) || 0;
      state.sound = saved.sound !== false;
      state.theme = ["classic", "bloom", "bolt"].includes(saved.theme) ? saved.theme : "classic";
    } catch (error) { console.warn("Saved game data was unreadable; starting fresh.", error); }
    Object.keys(state.progress).forEach(op => {
      const value = Number(state.progress[op]);
      state.progress[op] = Number.isFinite(value) ? Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(value))) : 1;
    });
    document.body.dataset.theme = state.theme;
    document.body.dataset.op = state.op;
    refillHints();
  }
  function save() { safeSave(); }
  function refillHints() {
    const now = Date.now();
    if (!state.hintRefillAt || now >= state.hintRefillAt) {
      state.hints = 2;
      state.hintRefillAt = now + DAY_MS;
      save();
    }
  }
  const currentLevel = () => state.progress[state.op] || 1;
  const isDone = level => !!state.completed[`${state.op}:${level}`];
  const comma = n => Number(n).toLocaleString("en-IN");

  function updateHome() {
    const level = currentLevel();
    $("progressText").textContent = `Level ${comma(level)} of ${comma(TOTAL_LEVELS)}`;
    $("streakText").textContent = `${comma(state.bestStreak)} correct`;
    $("smashText").textContent = `${comma(state.smashes)} answers`;
    $("hintCount").textContent = state.hints;
    $("levelCount").textContent = `LEVEL ${comma(level)} / ${comma(TOTAL_LEVELS)}`;
    $("currentLevelText").textContent = `Level ${comma(level)} is ready`;
    $("nextLevelText").textContent = level < TOTAL_LEVELS ? `Next up: Level ${comma(level + 1)}` : "Final level unlocked — legend status!";
    const cleared = Object.keys(state.completed).filter(key => key.startsWith(`${state.op}:`)).length;
    $("levelRangeText").textContent = `${comma(cleared)} CLEARED`;
    $("gameHintCount").textContent = state.hints;
    $("hintUseCount").textContent = state.hints;
    renderLevels();
  }
  function renderLevels() {
    const wrap = $("levelTrack");
    const maxStart = currentLevel();
    levelWindow = Math.max(1, Math.min(levelWindow, maxStart));
    wrap.innerHTML = "";
    [levelWindow, Math.min(TOTAL_LEVELS, levelWindow + 1)].forEach((level, index) => {
      const done = isDone(level);
      const current = level === currentLevel();
      const unlocked = level <= currentLevel() || done;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `level-tile ${current ? "current" : "next"}${done ? " done" : ""}`;
      button.disabled = !unlocked;
      button.innerHTML = `${done ? "★ " : ""}${comma(level)}<small>${done ? "CLEARED" : current ? "PLAY THIS LEVEL" : "UP NEXT"}</small>`;
      button.setAttribute("aria-label", `Level ${level}${done ? ", cleared" : unlocked ? ", ready" : ", locked"}`);
      button.addEventListener("click", () => openLevel(level));
      wrap.appendChild(button);
    });
    $("levelPrev").disabled = levelWindow <= 1;
    $("levelNext").disabled = levelWindow >= maxStart || levelWindow + 1 >= TOTAL_LEVELS;
  }
  function openModal(kicker, title, body, actions, options = {}) {
    if (state.game && state.game.timer) {
      clearInterval(state.game.timer);
      state.game.timer = null;
    }
    $("modalClose").style.display = (options.noClose || (state.game && state.game.locked)) ? "none" : "";
    $("infoModal").classList.toggle("solution-modal", !!options.solution);
    $("modalKicker").textContent = kicker;
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = body;
    const actionsNode = $("modalActions");
    actionsNode.innerHTML = "";
    actions.forEach(action => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = action.secondary ? "secondary-btn" : "primary-btn";
      button.textContent = action.label;
      button.addEventListener("click", () => {
        closeModal();
        if (typeof action.run === "function") action.run();
        ensureTimer();
      });
      actionsNode.appendChild(button);
    });
    $("modalBackdrop").classList.add("show");
  }
  function closeModal() {
    $("modalBackdrop").classList.remove("show");
    $("modalClose").style.display = "";
    $("infoModal").classList.remove("solution-modal");
    ensureTimer();
  }
  function ensureTimer() {
    const game = state.game;
    if (game && !game.locked && game.timeLeft > 0 && !game.timer) game.timer = setInterval(tickTimer, 1000);
  }
  function openLevel(level) {
    const seconds = timeForLevel(level);
    const replay = level < currentLevel();
    openModal(`LEVEL ${comma(level)}`, replay ? "Play this level again?" : "Ready, brain champ?",
      `Solve <strong>${QUESTIONS_PER_LEVEL} questions</strong> before the clock runs out. This level gives you <strong>${formatTime(seconds)}</strong>. You have three hearts for each question.`,
      [{ label: "LET'S PLAY", run: () => startGame(level) }, { label: "NOT YET", secondary: true }]);
  }
  function howTo() {
    openModal("QUICK GUIDE", "Think. Aim. Smash.",
      `<ol class="modal-list"><li>Choose addition, subtraction, multiplication or division.</li><li>Play your current level. Finish five questions before the clock runs out.</li><li>Tap the correct number block. Wrong answers cost a heart.</li><li>Some rounds hide a number. Work backwards to find it.</li><li>After every correct answer, a simple step-by-step explanation appears.</li><li>Two hints refresh every 24 hours on this device.</li></ol><strong>Clock rules:</strong> 1-digit levels get 1 minute, 2- and 3-digit levels get 2 minutes, and 4+ digit levels get 4 minutes. The number of digits grows as you progress.`,
      [{ label: "GOT IT" }]);
  }
  function startGame(level) {
    if (state.game && state.game.timer) clearInterval(state.game.timer);
    const seconds = timeForLevel(level);
    state.game = { level, question: 0, lives: 3, answer: 0, questionData: null, locked: false, usedHint: false, timeLeft: seconds, timer: null };
    $("gameOverlay").classList.remove("hidden");
    $("gameOperationLabel").textContent = OPS[state.op];
    $("gameLevelLabel").textContent = `LEVEL ${comma(level)}`;
    updateGameHints();
    updateTimer();
    nextQuestion();
    ensureTimer();
  }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function digitsForLevel(level) {
    if (level <= 30) return 1;
    if (level <= 180) return 2;
    if (level <= 600) return 3;
    if (level <= 2000) return 4;
    if (level <= 5500) return 5;
    return 6;
  }
  function timeForLevel(level) {
    const digits = digitsForLevel(level);
    return digits === 1 ? 60 : digits <= 3 ? 120 : 240;
  }
  function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
  function updateTimer() {
    if (!state.game) return;
    $("timerText").textContent = formatTime(state.game.timeLeft);
    $("gameTimer").classList.toggle("urgent", state.game.timeLeft <= 15);
  }
  function tickTimer() {
    const game = state.game;
    if (!game || game.locked) return;
    game.timeLeft = Math.max(0, game.timeLeft - 1);
    updateTimer();
    if (game.timeLeft <= 0) {
      clearInterval(game.timer);
      game.timer = null;
      game.locked = true;
      openModal("TIME'S UP!", "The clock got you!", `You reached question ${Math.min(game.question + 1, QUESTIONS_PER_LEVEL)}. Take a breath and try this level again.`,
        [{ label: "RETRY LEVEL", run: () => startGame(game.level) }, { label: "HOME", secondary: true, run: endGame }]);
    }
  }
  function makeQuestion(level, questionIndex) {
    const digits = digitsForLevel(level);
    const min = digits === 1 ? 1 : Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    let a, b, result, expression;
    const op = state.op;
    if (op === "+") {
      a = rand(min, max); b = rand(min, max); result = a + b; expression = `${comma(a)} + ${comma(b)}`;
    } else if (op === "-") {
      a = rand(min, max); b = rand(min, max);
      if (b > a) [a, b] = [b, a];
      result = a - b; expression = `${comma(a)} − ${comma(b)}`;
    } else if (op === "*") {
      a = rand(min, max); b = rand(min, max);
      result = a * b; expression = `${comma(a)} × ${comma(b)}`;
    } else {
      // Exact division: the dividend is always divisor multiplied by quotient.
      b = rand(Math.max(2, min), Math.max(2, max));
      result = rand(Math.max(1, min), max);
      a = b * result;
      expression = `${comma(a)} ÷ ${comma(b)}`;
    }
    const originalResult = result;
    const tricky = level >= 12 && (questionIndex === 4 || (level >= 50 && questionIndex === 2));
    let missingLeft = false;
    if (tricky) {
      missingLeft = Math.random() < 0.5;
      const symbol = op === "*" ? "×" : op === "/" ? "÷" : op === "-" ? "−" : "+";
      if (missingLeft) {
        expression = `? ${symbol} ${comma(b)} = ${comma(originalResult)}`;
        result = a;
      } else {
        expression = `${comma(a)} ${symbol} ? = ${comma(originalResult)}`;
        result = b;
      }
    }
    return { a, b, answer: result, expression, tricky, missingLeft, originalResult, op };
  }
  function makeOptions(answer) {
    const options = new Set([answer]);
    let attempts = 0;
    const spread = Math.max(5, Math.ceil(Math.abs(answer) * 0.12));
    while (options.size < 5 && attempts < 300) {
      attempts++;
      const delta = rand(1, spread);
      const candidate = answer + (Math.random() < 0.5 ? -delta : delta);
      if (candidate >= 0 && candidate !== answer) options.add(candidate);
    }
    let offset = 1;
    while (options.size < 5) options.add(answer + offset++);
    return [...options].sort(() => Math.random() - 0.5);
  }
  function nextQuestion() {
    const game = state.game;
    if (!game) return;
    if (game.question >= QUESTIONS_PER_LEVEL) { completeLevel(); return; }
    game.locked = false;
    game.lives = 3;
    game.usedHint = false;
    const question = makeQuestion(game.level, game.question);
    game.answer = question.answer;
    game.questionData = question;
    $("questionText").innerHTML = `${question.expression}${question.tricky ? "" : " <em>= ?</em>"}`;
    $("challengeTag").textContent = question.tricky ? "TWIST ROUND · MISSING NUMBER" : (game.level < 10 ? "QUICK THINKER" : "BRAIN BOOST ROUND");
    $("questionSub").textContent = question.tricky ? "A number is hiding. Find it!" : "Find the correct number and smash it.";
    $("questionProgress").style.width = `${(game.question / QUESTIONS_PER_LEVEL) * 100}%`;
    $("lives").textContent = "♥ ♥ ♥";
    $("smashMessage").className = "smash-message";
    const grid = $("answerGrid");
    grid.innerHTML = "";
    makeOptions(question.answer).forEach(number => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-block";
      button.textContent = comma(number);
      button.dataset.answer = String(number);
      button.setAttribute("aria-label", `Answer ${comma(number)}`);
      button.addEventListener("click", () => hitAnswer(button, number));
      grid.appendChild(button);
    });
  }
  function playTone(frequency = 440, duration = 0.09, type = "sine") {
    if (!state.sound) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      state.audio = state.audio || new AudioContextClass();
      if (state.audio.state === "suspended") state.audio.resume();
      const context = state.audio;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.065, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + duration);
    } catch (_) { /* Sound is optional. */ }
  }
  function hammerAnimation(button) {
    const hammer = $("hammerCursor");
    const buttonRect = button.getBoundingClientRect();
    const gridRect = $("answerGrid").getBoundingClientRect();
    hammer.style.left = `${buttonRect.left + buttonRect.width / 2 - gridRect.left}px`;
    hammer.style.top = `${buttonRect.top + buttonRect.height / 2 - gridRect.top}px`;
    hammer.classList.remove("swing");
    void hammer.offsetWidth;
    hammer.classList.add("swing");
  }
  function showMessage(message) {
    const node = $("smashMessage");
    node.textContent = message;
    node.classList.remove("show");
    void node.offsetWidth;
    node.classList.add("show");
  }
  function placeParts(number) {
    return [...String(Math.abs(number))].map((digit, index, all) => Number(digit) * Math.pow(10, all.length - index - 1)).filter(value => value !== 0);
  }
  function explanation(question) {
    const { a, b, op, answer, tricky, missingLeft, originalResult } = question;
    const symbol = op === "*" ? "×" : op === "/" ? "÷" : op === "-" ? "−" : "+";
    if (tricky) {
      let rule, work;
      if (missingLeft) {
        if (op === "+") { rule = "Undo addition with subtraction."; work = `${comma(originalResult)} − ${comma(b)} = ${comma(answer)}`; }
        if (op === "-") { rule = "For a missing first number in subtraction, add the result and the number taken away."; work = `${comma(originalResult)} + ${comma(b)} = ${comma(answer)}`; }
        if (op === "*") { rule = "Undo multiplication with division."; work = `${comma(originalResult)} ÷ ${comma(b)} = ${comma(answer)}`; }
        if (op === "/") { rule = "Undo division with multiplication."; work = `${comma(originalResult)} × ${comma(b)} = ${comma(answer)}`; }
      } else {
        if (op === "+") { rule = "Undo addition with subtraction."; work = `${comma(originalResult)} − ${comma(a)} = ${comma(answer)}`; }
        if (op === "-") { rule = "Subtract the result from the first number to find what was taken away."; work = `${comma(a)} − ${comma(originalResult)} = ${comma(answer)}`; }
        if (op === "*") { rule = "Undo multiplication with division."; work = `${comma(originalResult)} ÷ ${comma(a)} = ${comma(answer)}`; }
        if (op === "/") { rule = "Divide the dividend by the result to find the missing divisor."; work = `${comma(a)} ÷ ${comma(originalResult)} = ${comma(answer)}`; }
      }
      return `<p><strong>Step 1:</strong> Look at the missing number in <strong>${question.expression}</strong>.</p><p><strong>Step 2:</strong> ${rule}</p><div class="solution-math">${work}</div><p><strong>Answer:</strong> ${comma(answer)}. The opposite operation helps us work backwards.</p>`;
    }
    if (op === "+" || op === "-") {
      const parts = placeParts(b);
      let running = a;
      const lines = parts.map(part => {
        running = op === "+" ? running + part : running - part;
        return `${comma(op === "+" ? running - part : running + part)} ${symbol} ${comma(part)} = ${comma(running)}`;
      });
      const instruction = op === "+" ? "Break the second number into place values, then add each part." : "Break the number being subtracted into place values, then subtract each part.";
      return `<p><strong>Step 1:</strong> Start with <strong>${comma(a)}</strong>.</p><p><strong>Step 2:</strong> Split ${comma(b)} into <strong>${parts.map(comma).join(" + ")}</strong>. ${instruction}</p><div class="solution-math">${lines.join("<br>")}</div><p><strong>Answer:</strong> ${comma(answer)}.</p>`;
    }
    if (op === "*") {
      const parts = placeParts(b);
      const products = parts.map(part => `${comma(a)} × ${comma(part)} = ${comma(a * part)}`);
      const partials = parts.map(part => a * part);
      return `<p><strong>Step 1:</strong> Split ${comma(b)} into <strong>${parts.map(comma).join(" + ")}</strong>.</p><p><strong>Step 2:</strong> Multiply the first number by each place-value part.</p><div class="solution-math">${products.join("<br>")}</div><p><strong>Step 3:</strong> Add the partial answers: ${partials.map(comma).join(" + ")} = <strong>${comma(answer)}</strong>.</p>`;
    }
    return `<p><strong>Step 1:</strong> Division asks how many groups of <strong>${comma(b)}</strong> fit into <strong>${comma(a)}</strong>.</p><div class="solution-math">${comma(b)} × ${comma(answer)} = ${comma(a)}</div><p><strong>Step 2:</strong> Check by multiplying the divisor by the quotient.</p><p><strong>Answer:</strong> ${comma(a)} ÷ ${comma(b)} = <strong>${comma(answer)}</strong>.</p>`;
  }
  function showSolution(game) {
    openModal("HOW TO SOLVE IT", "Nice smash. Here's why!", explanation(game.questionData),
      [{ label: game.question + 1 < QUESTIONS_PER_LEVEL ? "NEXT QUESTION" : "FINISH LEVEL", run: () => {
        if (state.game !== game) return;
        game.question++;
        nextQuestion();
      }}], { noClose: true, solution: true });
  }
  function hitAnswer(button, number) {
    const game = state.game;
    if (!game || game.locked || button.disabled) return;
    hammerAnimation(button);
    if (number === game.answer) {
      game.locked = true;
      button.classList.add("correct");
      playTone(640, 0.16, "triangle");
      showMessage("NICE HIT! +10");
      state.smashes++; state.score += 10; state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      save();
      $("questionSub").textContent = "Perfect! Let's see the simple method.";
      setTimeout(() => { if (state.game === game) showSolution(game); }, 420);
    } else {
      button.disabled = true;
      button.classList.add("wrong");
      game.lives--;
      state.streak = 0;
      save();
      playTone(155, 0.18, "sawtooth");
      $("lives").textContent = `${"♥ ".repeat(game.lives)}${"♡ ".repeat(3 - game.lives)}`.trim();
      $("questionSub").textContent = "Not that one. Check the calculation.";
      if (game.lives <= 0) {
        game.locked = true;
        setTimeout(questionFailed, 450);
      }
    }
  }
  function questionFailed() {
    const game = state.game;
    if (!game) return;
    openModal("ROUND OVER", "One more try?", `The correct answer was <strong>${comma(game.answer)}</strong>. Try this question again.`,
      [{ label: "RETRY QUESTION", run: () => { game.locked = false; nextQuestion(); } }, { label: "BACK TO HOME", secondary: true, run: endGame }]);
  }
  function completeLevel() {
    const game = state.game;
    if (!game) return;
    if (game.timer) clearInterval(game.timer);
    game.timer = null;
    state.completed[`${state.op}:${game.level}`] = true;
    if (game.level >= currentLevel() && currentLevel() < TOTAL_LEVELS) state.progress[state.op] = game.level + 1;
    save();
    const completedLevel = game.level;
    const remaining = game.timeLeft;
    $("gameOverlay").classList.add("hidden");
    state.game = null;
    levelWindow = currentLevel();
    updateHome();
    const next = Math.min(TOTAL_LEVELS, completedLevel + 1);
    openModal("LEVEL CLEARED!", "Smash-tastic work!", `You cleared all five questions with <strong>${formatTime(remaining)}</strong> left. Your total score is <strong>${comma(state.score)}</strong>.`,
      [{ label: completedLevel < TOTAL_LEVELS ? "NEXT LEVEL" : "PLAY AGAIN", run: () => startGame(next) }, { label: "HOME", secondary: true }]);
  }
  function endGame() {
    if (state.game && state.game.timer) clearInterval(state.game.timer);
    state.game = null;
    $("gameOverlay").classList.add("hidden");
    updateHome();
  }
  function updateGameHints() {
    $("gameHintCount").textContent = state.hints;
    $("hintUseCount").textContent = state.hints;
  }
  function useHint() {
    const game = state.game;
    if (!game || game.locked) return;
    refillHints();
    if (state.hints <= 0) {
      openModal("HINTS EMPTY", "No hints left", "Your two hints refresh every 24 hours on this device.", [{ label: "CONTINUE" }]);
      return;
    }
    if (game.usedHint) { showMessage("HINT ALREADY USED"); return; }
    state.hints--;
    game.usedHint = true;
    save(); updateGameHints(); updateHome();
    const wrong = [...$("answerGrid").querySelectorAll(".answer-block")].filter(item => Number(item.dataset.answer) !== game.answer && !item.disabled);
    wrong.slice(0, 2).forEach(item => { item.disabled = true; item.classList.add("fallen"); });
    $("questionSub").textContent = "Two incorrect choices removed. You can do this.";
    showMessage("2 OPTIONS REMOVED");
    playTone(520, 0.1, "sine");
  }
  function pauseGame() {
    const game = state.game;
    if (!game || game.locked) return;
    game.locked = true;
    openModal("PAUSED", "Take a breather.", "Your clock is paused while this window is open.", [
      { label: "RESUME", run: () => { if (state.game) state.game.locked = false; } },
      { label: "EXIT TO HOME", secondary: true, run: endGame }
    ]);
  }
  function chooseOperation(operation) {
    if (!OPS[operation]) return;
    state.op = operation;
    document.body.dataset.op = operation;
    document.querySelectorAll(".operation").forEach(button => {
      const active = button.dataset.op === operation;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    levelWindow = currentLevel();
    updateHome();
  }
  function chooseTheme(theme) {
    if (!["classic", "bloom", "bolt"].includes(theme)) return;
    state.theme = theme;
    document.body.dataset.theme = theme;
    document.querySelectorAll(".theme-choice").forEach(button => {
      const active = button.dataset.themeChoice === theme;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    save();
  }
  function resetProgress() {
    openModal("START FRESH?", "Reset your progress?", "This clears all four operation tracks, completed levels, score, streaks and hint timing on this device.", [
      { label: "RESET EVERYTHING", run: () => { localStorage.removeItem(STORAGE_KEY); location.reload(); } },
      { label: "KEEP MY PROGRESS", secondary: true }
    ]);
  }
  function setupInstallPrompt() {
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      installPrompt = event;
      $("installBtn").hidden = false;
    });
    $("installBtn").addEventListener("click", async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      $("installBtn").hidden = true;
    });
    window.addEventListener("appinstalled", () => { $("installBtn").hidden = true; });
  }
  function init() {
    loadState();
    $("soundToggle").textContent = state.sound ? "♫" : "♪";
    document.querySelectorAll(".theme-choice").forEach(button => {
      const active = button.dataset.themeChoice === state.theme;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    updateHome();
    setTimeout(() => { $("loader").classList.add("fade"); $("app").classList.remove("hidden"); }, 850);
    $("operationList").addEventListener("click", event => {
      const button = event.target.closest("[data-op]");
      if (button) chooseOperation(button.dataset.op);
    });
    $("themeList").addEventListener("click", event => {
      const button = event.target.closest("[data-theme-choice]");
      if (button) chooseTheme(button.dataset.themeChoice);
    });
    $("levelPrev").addEventListener("click", () => { levelWindow = Math.max(1, levelWindow - 1); renderLevels(); });
    $("levelNext").addEventListener("click", () => { levelWindow = Math.min(currentLevel(), levelWindow + 1); renderLevels(); });
    $("continueBtn").addEventListener("click", () => openLevel(currentLevel()));
    $("howBtn").addEventListener("click", howTo);
    $("helpBtn").addEventListener("click", howTo);
    $("hintInfo").addEventListener("click", () => openModal("HINT POCKET", `${state.hints} hints available`, "You receive two hints per 24-hour refill cycle. A hint removes two incorrect number blocks. Hints are saved on this device.", [{ label: "GOT IT" }]));
    $("modalClose").addEventListener("click", closeModal);
    $("modalBackdrop").addEventListener("click", event => {
      if (event.target === $("modalBackdrop") && !$("infoModal").classList.contains("solution-modal") && !(state.game && state.game.locked)) closeModal();
    });
    $("gameBack").addEventListener("click", () => {
      const game = state.game;
      if (!game) return;
      game.locked = true;
      openModal("LEAVE THIS LEVEL?", "Go back home?", "Your current round will end. Completed levels and stats stay saved.", [
        { label: "GO HOME", run: endGame },
        { label: "KEEP PLAYING", secondary: true, run: () => { if (state.game) state.game.locked = false; } }
      ]);
    });
    $("pauseBtn").addEventListener("click", pauseGame);
    $("useHint").addEventListener("click", useHint);
    $("soundToggle").addEventListener("click", () => {
      state.sound = !state.sound;
      $("soundToggle").textContent = state.sound ? "♫" : "♪";
      save();
      if (state.sound) playTone(520, 0.08, "sine");
    });
    $("resetBtn").addEventListener("click", resetProgress);
    setupInstallPrompt();
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(error => console.warn("Offline setup skipped:", error)));
    }
  }
  document.addEventListener("DOMContentLoaded", init);
})();
