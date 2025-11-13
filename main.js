// ===========================
// TROCA DE PÁGINAS
// ===========================

const pages = {
  menu: document.getElementById("menu"),
  jogos: document.getElementById("jogos"),
  creditos: document.getElementById("creditos")
};

function showPage(id) {
  Object.values(pages).forEach(p => p.style.display = "none");
  pages[id].style.display = "block";
}

document.getElementById("btn-jogos").onclick = () => showPage("jogos");
document.getElementById("btn-creditos").onclick = () => showPage("creditos");

document.querySelectorAll(".back").forEach(btn => {
  btn.onclick = () => showPage("menu");
});
document.getElementById("back-menu").onclick = () => showPage("menu");


// ===========================
// PONG
// ===========================

const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d");

let player = { x: 10, y: 200, w: 10, h: 80, score: 0 };
let ai = { x: 780, y: 200, w: 10, h: 80, score: 0 };
let ball = { x: 400, y: 240, r: 8, dx: 4, dy: 4 };

let aiSpeed = 2;
let running = false;

// Escolha da dificuldade
document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.onclick = () => {
    const diff = btn.dataset.diff;

    if (diff === "facil") aiSpeed = 2;
    if (diff === "medio") aiSpeed = 4;
    if (diff === "dificil") aiSpeed = 6;

    startGame();
  };
});

function resetBall() {
  ball.x = 400;
  ball.y = 240;
  ball.dx = (Math.random() < 0.5 ? -4 : 4);
  ball.dy = 4;
}

function startGame() {
  player.score = 0;
  ai.score = 0;

  document.getElementById("end-message").classList.add("hidden");

  resetBall();
  running = true;
  loop();
}

function loop() {
  if (!running) return;
  update();
  draw();
  requestAnimationFrame(loop);
}

function update() {
  // Movimento do jogador pelo mouse
  canvas.onmousemove = e => {
    const rect = canvas.getBoundingClientRect();
    player.y = e.clientY - rect.top - player.h / 2;
  };

  // IA acompanhando a bola
  if (ai.y + ai.h / 2 < ball.y) ai.y += aiSpeed;
  else ai.y -= aiSpeed;

  // Movimento da bola
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Colisão com teto/chão
  if (ball.y < 0 || ball.y > canvas.height) ball.dy *= -1;

  // Player colide
  if (
    ball.x - ball.r < player.x + player.w &&
    ball.y > player.y &&
    ball.y < player.y + player.h
  ) {
    ball.dx *= -1;
  }

  // IA colide
  if (
    ball.x + ball.r > ai.x &&
    ball.y > ai.y &&
    ball.y < ai.y + ai.h
  ) {
    ball.dx *= -1;
  }

  // Pontos
  if (ball.x < 0) {
    ai.score++;
    resetBall();
  }

  if (ball.x > canvas.width) {
    player.score++;
    resetBall();
  }

  document.getElementById("player-score").textContent = player.score;
  document.getElementById("ai-score").textContent = ai.score;

  // Fim do jogo
  if (player.score >= 7 || ai.score >= 7) {
    endGame();
  }
}

function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";

  // Player paddle
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // AI paddle
  ctx.fillRect(ai.x, ai.y, ai.w, ai.h);

  // Bola
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}

function endGame() {
  running = false;

  const msg =
    player.score > ai.score ? "Você venceu!" : "A IA venceu!";

  document.getElementById("winner-text").textContent = msg;
  document.getElementById("end-message").classList.remove("hidden");
}
