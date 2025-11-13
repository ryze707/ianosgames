const GEMINI_API_KEY = "AIzaSyDvbUN8JYqndrzoek1LF5KeOHoUGjEJGuY";

document.addEventListener("DOMContentLoaded", () => {
  const pageMenu = document.getElementById("menu");
  const pageChat = document.getElementById("chat");
  const pageJogos = document.getElementById("jogos");
  const pageCreds = document.getElementById("creditos");
  const pages = { menu: pageMenu, chat: pageChat, jogos: pageJogos, creditos: pageCreds };

  function showPage(id) {
    Object.values(pages).forEach(p => p.style.display = "none");
    pages[id].style.display = "flex";
    if (id !== "jogos") hideEndMessage();
  }

  const btnChat = document.getElementById("btn-chat");
  const btnJogos = document.getElementById("btn-jogos");
  const btnCreds = document.getElementById("btn-creditos");
  btnChat.addEventListener("click", () => showPage("chat"));
  btnJogos.addEventListener("click", () => showPage("jogos"));
  btnCreds.addEventListener("click", () => showPage("creditos"));
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
  appendChat("Chat pronto. Digite algo para começar.", "ai");

  async function callGemini(prompt) {
    if (!GEMINI_API_KEY) throw new Error("Chave API não configurada");
    const MODEL_NAME = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 300 } };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error();

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text;
      if (!reply) throw new Error();
      return reply.trim();
    } catch {
      return "A ia está sobrecarregada, tente novamente mais tarde.";
    }
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

    const reply = await callGemini(txt);
    thinking.remove();
    appendChat(reply, "ai");
  }

  sendBtn.addEventListener("click", sendChat);
  userInput.addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });

  const canvas = document.getElementById("pong");
  const ctx = canvas.getContext("2d");
  const countdownEl = document.getElementById("countdown");
  const playerScoreEl = document.getElementById("player-score");
  const aiScoreEl = document.getElementById("ai-score");
  const endMessage = document.getElementById("end-message");
  const winnerText = document.getElementById("winner-text");
  const backMenuBtn = document.getElementById("back-menu");

  const state = { running: false, difficulty: "medio", playerScore: 0, aiScore: 0, target: 3, ended: false };
  const paddle = { x: 10, w: 12, h: 90, y: canvas.height / 2 - 45 };
  const aiPaddle = { x: canvas.width - 22, w: 12, h: 90, y: canvas.height / 2 - 45 };
  const ball = { x: canvas.width / 2, y: canvas.height / 2, r: 8, vx: 0, vy: 0, speed: 5 };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function resetBall(dir = (Math.random() < 0.5 ? 1 : -1)) {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8);
    let speed = 5;
    if (state.difficulty === "dificil") speed *= 1.4;
    ball.vx = speed * dir * Math.cos(angle);
    ball.vy = speed * Math.sin(angle);
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
    else { react = 0.02; error = (Math.random() * 0.2 - 0.1) * 20; }

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

    if (state.difficulty === "dificil") {
      ball.vx *= 1.001;
      ball.vy *= 1.001;
    }
  }

  function checkScore() {
    playerScoreEl.textContent = state.playerScore;
    aiScoreEl.textContent = state.aiScore;
    if (state.playerScore >= state.target || state.aiScore >= state.target) {
      state.running = false;
      showEnd(state.playerScore > state.aiScore);
    }
  }

  function showEnd(win) {
    winnerText.textContent = win ? "🎉 Você venceu!" : "😢 Você perdeu!";
    endMessage.classList.remove("hidden");
    state.running = false;
    state.ended = true;
  }

  function hideEndMessage() {
    endMessage.classList.add("hidden");
    winnerText.textContent = "";
    state.ended = false;
  }

  let countdownTimer = null;
  function startCountdown(seconds = 3, dir = (Math.random() < 0.5 ? 1 : -1)) {
    let n = seconds;
    countdownEl.textContent = n;
    countdownEl.style.visibility = "visible";
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      n--;
      countdownEl.textContent = n > 0 ? n : "GO!";
      if (n < 0) {
        clearInterval(countdownTimer);
        countdownEl.style.visibility = "hidden";
        resetBall(dir);
        state.running = true;
      }
    }, 1000);
  }

  function pauseRound(dir) { state.running = false; startCountdown(3, dir); }

  function loop() {
    if (state.ended) { drawScene(); return; }
    if (state.running) { 
      ball.x += ball.vx; 
      ball.y += ball.vy; 
      handleCollisions(); 
      aiMove(); 
      if (ball.x < 0) { state.aiScore++; checkScore(); if (!state.ended) pauseRound(1); } 
      else if (ball.x > canvas.width) { state.playerScore++; checkScore(); if (!state.ended) pauseRound(-1); } 
    }
    drawScene();
    requestAnimationFrame(loop);
  }

  resetBall();
  loop();

  canvas.addEventListener("mousemove", e => { const rect = canvas.getBoundingClientRect(); const y = e.clientY - rect.top; paddle.y = clamp(y - paddle.h / 2, 0, canvas.height - paddle.h); });
  canvas.addEventListener("touchmove", e => { if (!e.touches || !e.touches[0]) return; const rect = canvas.getBoundingClientRect(); const y = e.touches[0].clientY - rect.top; paddle.y = clamp(y - paddle.h / 2, 0, canvas.height - paddle.h); }, { passive: true });

  document.querySelectorAll(".diff-btn").forEach(btn => { 
    btn.addEventListener("click", () => { 
      document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("selected")); 
      btn.classList.add("selected"); 
      state.difficulty = btn.dataset.diff; 
      state.playerScore = 0; 
      state.aiScore = 0; 
      playerScoreEl.textContent = "0"; 
      aiScoreEl.textContent = "0"; 
      hideEndMessage(); 
      resetBall(); 
      startCountdown(3, Math.random() < 0.5 ? 1 : -1); 
    }); 
  });

  backMenuBtn.addEventListener("click", () => { 
    state.running = false; 
    state.playerScore = 0; 
    state.aiScore = 0; 
    playerScoreEl.textContent = "0"; 
    aiScoreEl.textContent = "0"; 
    hideEndMessage(); 
    resetBall(); 
    showPage("menu"); 
  });

  window._IA_PROJECT = { state, ball, paddle, aiPaddle };
});

