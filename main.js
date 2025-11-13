const GEMINI_API_KEY = "AIzaSyAS-SLe94hpmyLp8Iv8IjXfB_UW4"; 

document.addEventListener("DOMContentLoaded", () => {
  const pageMenu = document.getElementById("menu");
  const pageChat = document.getElementById("chat");
  const pageJogos = document.getElementById("jogos");
  const pageCreds = document.getElementById("creditos");
  const pages = { menu: pageMenu, chat: pageChat, jogos: pageJogos, creditos: pageCreds };

  function showPage(id) {
    if (!pages[id]) return;
    Object.values(pages).forEach(p => { if (p) p.style.display = "none"; });
    pages[id].style.display = "flex";
    if (id !== "jogos") resetGamePartial();
  }

  const btnChat = document.getElementById("btn-chat");
  const btnJogos = document.getElementById("btn-jogos");
  const btnCreds = document.getElementById("btn-creditos");
  if (btnChat) btnChat.addEventListener("click", () => showPage("chat"));
  if (btnJogos) btnJogos.addEventListener("click", () => showPage("jogos"));
  if (btnCreds) btnCreds.addEventListener("click", () => showPage("creditos"));
  document.querySelectorAll(".back").forEach(b => b.addEventListener("click", () => showPage("menu")));

  const chatBox = document.getElementById("chat-box");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");

  function appendChat(text, who = "ai") {
    if (!chatBox) return;
    const d = document.createElement("div");
    d.className = "msg " + who;
    d.innerText = text;
    chatBox.appendChild(d);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
  appendChat("Chat pronto. Cole sua chave em main.js para testar.", "ai");

  async function callGemini(prompt) {
    if (!GEMINI_API_KEY) throw new Error("API_KEY_MISSING");
    const MODEL_NAME = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL_NAME)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const body = {
      contents: [{ parts: [{ text: String(prompt) }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 300 }
    };
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const code = res.status;
      const err = new Error(`API_ERR ${code}`);
      err.body = txt;
      throw err;
    }
    const data = await res.json().catch(() => null);
    if (!data) throw new Error("NO_JSON");
    let reply = null;
    try {
      reply =
        data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text ||
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        data?.candidates?.[0]?.output ||
        data?.output?.[0]?.content?.[0]?.text ||
        data?.text ||
        null;
    } catch { reply = null; }
    if (!reply) {
      const j = JSON.stringify(data);
      const match = j.match(/"text"\s*:\s*"([^"]{1,2000})"/);
      if (match && match[1]) reply = match[1];
    }
    if (!reply) return JSON.stringify(data);
    return String(reply).trim();
  }

  async function sendChat() {
    const txt = (userInput?.value || "").trim();
    if (!txt) return;
    appendChat(txt, "user");
    if (userInput) userInput.value = "";
    const thinking = document.createElement("div");
    thinking.className = "msg ai";
    thinking.innerText = "Pensando...";
    chatBox.appendChild(thinking);
    chatBox.scrollTop = chatBox.scrollHeight;
    try {
      const reply = await callGemini(txt);
      thinking.remove();
      appendChat(reply, "ai");
    } catch (err) {
      thinking.remove();
      appendChat("O serviço está sobrecarregado, tente novamente mais tarde.", "ai");
    }
  }

  if (sendBtn) sendBtn.addEventListener("click", sendChat);
  if (userInput) userInput.addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });

  const canvas = document.getElementById("pong");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const countdownEl = document.getElementById("countdown");
  const playerScoreEl = document.getElementById("player-score");
  const aiScoreEl = document.getElementById("ai-score");
  const endMessage = document.getElementById("end-message");
  const winnerText = document.getElementById("winner-text");
  const backMenuBtn = document.getElementById("back-menu");

  const state = { running: false, difficulty: "medio", playerScore: 0, aiScore: 0, target: 3, ended: false };
  let speedupInterval = null;
  const paddle = { x: 10, w: 12, h: 90, y: canvas.height / 2 - 45 };
  const aiPaddle = { x: canvas.width - 22, w: 12, h: 90, y: canvas.height / 2 - 45 };
  const ball = { x: canvas.width / 2, y: canvas.height / 2, r: 8, vx: 0, vy: 0, baseSpeed: 5 };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function resetBall(dir = (Math.random() < 0.5 ? 1 : -1)) {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8);
    let speed = ball.baseSpeed;
    if (state.difficulty === "dificil") speed *= 1.4;
    ball.vx = speed * dir * Math.cos(angle);
    ball.vy = speed * Math.sin(angle);
  }

  function startSpeedup() {
    stopSpeedup();
    if (state.difficulty !== "dificil") return;
    speedupInterval = setInterval(() => {
      if (!state.running || state.ended) return;
      ball.vx *= 1.05;
      ball.vy *= 1.05;
    }, 1000);
  }

  function stopSpeedup() {
    if (speedupInterval) { clearInterval(speedupInterval); speedupInterval = null; }
  }

  function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#050507"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#222";
    for (let y = 0; y < canvas.height; y += 24) ctx.fillRect(canvas.width / 2 - 2, y + 6, 4, 12);
    ctx.fillStyle = "#fff";
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.fillRect(aiPaddle.x, aiPaddle.y, aiPaddle.w, aiPaddle.h);
    const g = ctx.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, 40);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#00ff9f"; ctx.font = "28px 'Press Start 2P'";
    if (playerScoreEl) ctx.fillText(state.playerScore, canvas.width / 2 - 80, 40);
    if (aiScoreEl) ctx.fillText(state.aiScore, canvas.width / 2 + 40, 40);
  }

  function aiMove() {
    const d = state.difficulty;
    let react, error;
    if (d === "facil") { react = 0.02; error = (Math.random() * 0.6 - 0.3) * 120; }
    else if (d === "medio") { react = 0.07; error = (Math.random() * 0.4 - 0.2) * 60; }
    else { react = 0.04; error = (Math.random() * 0.2 - 0.1) * 20; }
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
        const angle = relative * Math.PI / 4;
        const speed = Math.hypot(ball.vx, ball.vy) * 1.05;
        ball.vx = Math.abs(speed * Math.cos(angle));
        ball.vy = speed * Math.sin(angle);
        ball.x = paddle.x + paddle.w + ball.r + 0.5;
      }
    }

    if (ball.x + ball.r > aiPaddle.x) {
      if (ball.y > aiPaddle.y && ball.y < aiPaddle.y + aiPaddle.h) {
        const relative = (ball.y - (aiPaddle.y + aiPaddle.h / 2)) / (aiPaddle.h / 2);
        const angle = relative * Math.PI / 4;
        const speed = Math.hypot(ball.vx, ball.vy) * 1.05;
        ball.vx = -Math.abs(speed * Math.cos(angle));
        ball.vy = speed * Math.sin(angle);
        ball.x = aiPaddle.x - ball.r - 0.5;
      }
    }
  }

  function updateScoreUI() {
    if (playerScoreEl) playerScoreEl.textContent = state.playerScore;
    if (aiScoreEl) aiScoreEl.textContent = state.aiScore;
  }

  function checkScore() {
    updateScoreUI();
    if (state.playerScore >= state.target || state.aiScore >= state.target) {
      state.running = false;
      state.ended = true;
      stopSpeedup();
      showEnd(state.playerScore > state.aiScore);
    }
  }

  function showEnd(win) {
    if (winnerText) winnerText.textContent = win ? "🎉 Você venceu!" : "😢 Você perdeu!";
    if (endMessage) endMessage.classList.remove("hidden");
    state.running = false;
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
    if (countdownEl) { countdownEl.textContent = n; countdownEl.style.visibility = "visible"; }
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      n--;
      if (countdownEl) countdownEl.textContent = n > 0 ? n : "GO!";
      if (n < 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        if (countdownEl) countdownEl.style.visibility = "hidden";
        resetBall(dir);
        state.running = true;
        startSpeedup();
      }
    }, 1000);
  }

  function pauseRound(dir) {
    state.running = false;
    stopSpeedup();
    startCountdown(3, dir);
  }

  function loop() {
    if (state.ended) { drawScene(); requestAnimationFrame(loop); return; }
    if (state.running) {
      ball.x += ball.vx; ball.y += ball.vy;
      handleCollisions();
      aiMove();
      if (ball.x < 0) {
        state.aiScore++;
        checkScore();
        if (!state.ended) pauseRound(1);
      } else if (ball.x > canvas.width) {
        state.playerScore++;
        checkScore();
        if (!state.ended) pauseRound(-1);
      }
    }
    drawScene();
    requestAnimationFrame(loop);
  }

  function resetAllGameState() {
    state.running = false;
    state.ended = false;
    state.playerScore = 0;
    state.aiScore = 0;
    state.difficulty = "medio";
    state.target = 3;
    ball.baseSpeed = 5;
    stopSpeedup();
    updateScoreUI();
    hideEndMessage();
    resetBall();
    clearInterval(countdownTimer);
    countdownTimer = null;
    document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("selected"));
    const medioBtn = document.querySelector('.diff-btn[data-diff="medio"]');
    if (medioBtn) medioBtn.classList.add("selected");
  }

  function resetGamePartial() {
    if (!state.ended) return;
    resetAllGameState();
  }

  resetBall();
  loop();

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

  document.querySelectorAll(".diff-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.difficulty = btn.dataset.diff || "medio";
      state.playerScore = 0; state.aiScore = 0;
      state.target = 3;
      updateScoreUI();
      hideEndMessage();
      stopSpeedup();
      resetBall();
      startCountdown(3, Math.random() < 0.5 ? 1 : -1);
    });
  });

  if (backMenuBtn) backMenuBtn.addEventListener("click", () => {
    resetAllGameState();
    showPage("menu");
  });

  document.querySelectorAll(".back").forEach(b => b.addEventListener("click", () => {
    state.running = false;
    stopSpeedup();
  }));

  window._IA_PROJECT = { state, ball, paddle, aiPaddle };
});
