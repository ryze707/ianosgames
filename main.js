document.addEventListener("DOMContentLoaded", () => {
  const pageMenu = document.getElementById("menu");
  const pageJogos = document.getElementById("jogos");
  const pageCreds = document.getElementById("creditos");
  const pages = { menu: pageMenu, jogos: pageJogos, creditos: pageCreds };

  function showPage(id) {
    Object.values(pages).forEach(p => p && (p.style.display = "none"));
    if (pages[id]) pages[id].style.display = "flex";
    if (id !== "jogos") resetGameCompletely();
  }

  const btnJogos = document.getElementById("btn-jogos");
  const btnCreds = document.getElementById("btn-creditos");
  if (btnJogos) btnJogos.addEventListener("click", () => showPage("jogos"));
  if (btnCreds) btnCreds.addEventListener("click", () => showPage("creditos"));
  document.querySelectorAll(".back").forEach(b => b.addEventListener("click", () => showPage("menu")));

  // GAME ELEMENTS
  const canvas = document.getElementById("pong");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const countdownEl = document.getElementById("countdown");
  const playerScoreEl = document.getElementById("player-score");
  const aiScoreEl = document.getElementById("ai-score");
  const endMessage = document.getElementById("end-message");
  const winnerText = document.getElementById("winner-text");
  const backMenuBtn = document.getElementById("back-menu");
  const startBtn = document.getElementById("start-btn");
  const diffBtns = document.querySelectorAll(".diff-btn");

  const state = {
    running: false,
    difficulty: "medio",
    playerScore: 0,
    aiScore: 0,
    target: 3,
    ended: false,
    gameTickId: null,
    hardSpeedTimer: null
  };

  const paddle = { x: 10, w: 12, h: 90, y: canvas.height / 2 - 45 };
  const aiPaddle = { x: canvas.width - 22, w: 12, h: 90, y: canvas.height / 2 - 45 };
  const ball = { x: canvas.width / 2, y: canvas.height / 2, r: 8, vx: 0, vy: 0 };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function setTarget(n) { state.target = n; }

  function resetBall(dir = (Math.random() < 0.5 ? 1 : -1)) {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8);
    let baseSpeed = 5;
    if (state.difficulty === "dificil") baseSpeed *= 1.4;
    ball.vx = baseSpeed * dir * Math.cos(angle);
    ball.vy = baseSpeed * Math.sin(angle);
  }

  function resetGameCompletely() {
    // stop loops and timers
    state.running = false;
    state.ended = false;
    if (state.gameTickId) { cancelAnimationFrame(state.gameTickId); state.gameTickId = null; }
    if (state.hardSpeedTimer) { clearInterval(state.hardSpeedTimer); state.hardSpeedTimer = null; }

    // reset scores & UI
    state.playerScore = 0;
    state.aiScore = 0;
    if (playerScoreEl) playerScoreEl.textContent = "0";
    if (aiScoreEl) aiScoreEl.textContent = "0";
    hideEndMessage();

    // reset positions
    paddle.y = canvas.height / 2 - paddle.h / 2;
    aiPaddle.y = canvas.height / 2 - aiPaddle.h / 2;
    resetBall();
    drawScene();
    // don't automatically restart; wait user action
  }

  function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#050507";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#222";
    for (let y = 0; y < canvas.height; y += 24) ctx.fillRect(canvas.width / 2 - 2, y + 6, 4, 12);

    ctx.fillStyle = "#fff";
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.fillRect(aiPaddle.x, aiPaddle.y, aiPaddle.w, aiPaddle.h);

    const g = ctx.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, 40);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#00ff9f";
    ctx.font = "28px 'Press Start 2P'";
    ctx.fillText(state.playerScore, canvas.width / 2 - 80, 40);
    ctx.fillText(state.aiScore, canvas.width / 2 + 40, 40);
  }

  function aiMove() {
    const d = state.difficulty;
    let react, error;
    if (d === "facil") { react = 0.02; error = (Math.random() * 0.6 - 0.3) * 120; }
    else if (d === "medio") { react = 0.07; error = (Math.random() * 0.4 - 0.2) * 60; }
    else { react = 0.045; error = (Math.random() * 0.2 - 0.1) * 20; } // difícil reage menos (um pouco mais lento) mas é mais preciso via predição

    if (d === "dificil" && ball.vx > 0) {
      const dist = (aiPaddle.x - ball.x);
      const t = Math.abs(dist / (ball.vx || 0.0001));
      let predicted = ball.y + ball.vy * t;
      while (predicted < 0 || predicted > canvas.height) {
        if (predicted < 0) predicted = -predicted;
        if (predicted > canvas.height) predicted = 2 * canvas.height - predicted;
      }
      aiPaddle.y += (predicted - aiPaddle.h / 2 - aiPaddle.y) * react;
    } else {
      aiPaddle.y += ((ball.y + error) - (aiPaddle.y + aiPaddle.h / 2)) * react;
      if (d === "facil" && Math.random() < 0.004) aiPaddle.y += (Math.random() * 220 - 110);
    }
    aiPaddle.y = clamp(aiPaddle.y, 0, canvas.height - aiPaddle.h);
  }

  function handleCollisions() {
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }
    if (ball.y + ball.r > canvas.height) { ball.y = canvas.height - ball.r; ball.vy *= -1; }

    if (ball.x - ball.r < paddle.x + paddle.w) {
      if (ball.y > paddle.y && ball.y < paddle.y + paddle.h) {
        const relative = (ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
        const angle = relative * (Math.PI / 4);
        const speed = Math.hypot(ball.vx, ball.vy) * 1.05;
        ball.vx = Math.abs(speed * Math.cos(angle));
        ball.vy = speed * Math.sin(angle);
        ball.x = paddle.x + paddle.w + ball.r + 0.5;
      }
    }

    if (ball.x + ball.r > aiPaddle.x) {
      if (ball.y > aiPaddle.y && ball.y < aiPaddle.y + aiPaddle.h) {
        const relative = (ball.y - (aiPaddle.y + aiPaddle.h / 2)) / (aiPaddle.h / 2);
        const angle = relative * (Math.PI / 4);
        const speed = Math.hypot(ball.vx, ball.vy) * 1.05;
        ball.vx = -Math.abs(speed * Math.cos(angle));
        ball.vy = speed * Math.sin(angle);
        ball.x = aiPaddle.x - ball.r - 0.5;
      }
    }

    // modo difícil: bola acelera lentamente com o tempo (se estiver rodando partida)
    // controle via timer startHardSpeedAcceleration / stopHardSpeedAcceleration
  }

  function checkScore() {
    if (playerScoreEl) playerScoreEl.textContent = state.playerScore;
    if (aiScoreEl) aiScoreEl.textContent = state.aiScore;
    if (state.playerScore >= state.target || state.aiScore >= state.target) {
      state.running = false;
      showEnd(state.playerScore > state.aiScore);
    }
  }

  function showEnd(win) {
    if (winnerText) winnerText.textContent = win ? "🎉 Você venceu!" : "😢 Você perdeu!";
    if (endMessage) endMessage.classList.remove("hidden");
    stopHardSpeedAcceleration();
    state.ended = true;
  }

  function hideEndMessage() {
    if (endMessage) endMessage.classList.add("hidden");
    if (winnerText) winnerText.textContent = "";
    state.ended = false;
  }

  let countdownTimer = null;
  function startCountdown(seconds = 3, dir = (Math.random() < 0.5 ? 1 : -1)) {
    let n = seconds;
    if (countdownEl) {
      countdownEl.textContent = n;
      countdownEl.classList.remove("hidden");
    }
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      n--;
      if (countdownEl) countdownEl.textContent = n > 0 ? n : "GO!";
      if (n < 0) {
        clearInterval(countdownTimer);
        if (countdownEl) countdownEl.classList.add("hidden");
        resetBall(dir);
        state.running = true;
        if (state.difficulty === "dificil") startHardSpeedAcceleration();
      }
    }, 1000);
  }

  function pauseRound(dir) {
    state.running = false;
    stopHardSpeedAcceleration();
    startCountdown(3, dir);
  }

  function startHardSpeedAcceleration() {
    stopHardSpeedAcceleration();
    // a cada 1s aumenta a velocidade multiplicando os componentes por 1.01 (crescimento suave, sem teto)
    state.hardSpeedTimer = setInterval(() => {
      ball.vx *= 1.01;
      ball.vy *= 1.01;
    }, 1000);
  }

  function stopHardSpeedAcceleration() {
    if (state.hardSpeedTimer) { clearInterval(state.hardSpeedTimer); state.hardSpeedTimer = null; }
  }

  function loop() {
    if (state.ended) { drawScene(); state.gameTickId = requestAnimationFrame(loop); return; }
    if (state.running) {
      ball.x += ball.vx;
      ball.y += ball.vy;
      handleCollisions();
      aiMove();
      if (ball.x < 0) { state.aiScore++; checkScore(); if (!state.ended) pauseRound(1); }
      else if (ball.x > canvas.width) { state.playerScore++; checkScore(); if (!state.ended) pauseRound(-1); }
    }
    drawScene();
    state.gameTickId = requestAnimationFrame(loop);
  }

  // inputs
  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    paddle.y = clamp(y - paddle.h / 2, 0, canvas.height - paddle.h);
  });
  canvas.addEventListener("touchmove", e => {
    if (!e.touches || !e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    const y = e.touches[0].clientY - rect.top;
    paddle.y = clamp(y - paddle.h / 2, 0, canvas.height - paddle.h);
  }, { passive: true });

  // difficulty buttons
  diffBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      diffBtns.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.difficulty = btn.dataset.diff;
      resetGameCompletely();
    });
  });

  // start / back menu
  if (startBtn) startBtn.addEventListener("click", () => {
    if (state.running || state.ended) return;
    resetBall();
    startCountdown(3, Math.random() < 0.5 ? 1 : -1);
    // start loop if not running
    if (!state.gameTickId) loop();
  });

  if (backMenuBtn) backMenuBtn.addEventListener("click", () => {
    resetGameCompletely();
    showPage("menu");
  });

  // ensure page loads in menu and game is reset
  showPage("menu");
  drawScene();
});

