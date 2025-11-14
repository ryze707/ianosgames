const GEMINI_API_KEY = "AIzaSyAS-SLe94hpmyLp8IvX1VjIt8IjXfB_UW4";

console.log("main.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const pageMenu = document.getElementById("menu");
  const pageChat = document.getElementById("chat");
  const pageJogos = document.getElementById("jogos");
  const pageCreds = document.getElementById("creditos");
  const pages = { menu: pageMenu, chat: pageChat, jogos: pageJogos, creditos: pageCreds };

  function showPage(id) {
    if (!pages[id]) return;
    Object.values(pages).forEach(p => p.style.display = "none");
    pages[id].style.display = "flex";
    if (id !== "jogos") hideEndMessage();
  }

  document.getElementById("btn-chat")?.addEventListener("click", () => showPage("chat"));
  document.getElementById("btn-jogos")?.addEventListener("click", () => showPage("jogos"));
  document.getElementById("btn-creditos")?.addEventListener("click", () => showPage("creditos"));
  document.querySelectorAll(".back").forEach(b => b.addEventListener("click", () => showPage("menu")));

  // ---------- CHAT ----------
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
  appendChat("Chat pronto. Digite algo para começar o chat.", "ai");

  async function callGemini(prompt) {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");
    const MODEL_NAME = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    const body = { contents:[{parts:[{text:String(prompt)}]}], generationConfig:{temperature:0.6,maxOutputTokens:300}};
    try {
      const res = await fetch(url, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)});
      if(!res.ok) throw new Error();
      const data = await res.json();
      return data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text || "A IA não enviou uma resposta legível.";
    } catch {
      return "O serviço está sobrecarregado, tente novamente mais tarde.";
    }
  }

  async function sendChat() {
    const txt = (userInput?.value||"").trim();
    if(!txt) return;
    appendChat(txt,"user");
    if(userInput) userInput.value="";
    const thinking = document.createElement("div");
    thinking.className="msg ai"; thinking.innerText="Pensando...";
    chatBox.appendChild(thinking); chatBox.scrollTop=chatBox.scrollHeight;
    const reply = await callGemini(txt);
    thinking.remove(); appendChat(reply,"ai");
  }

  sendBtn?.addEventListener("click", sendChat);
  userInput?.addEventListener("keydown", e=>{ if(e.key==="Enter") sendChat(); });

  // ---------- PONG ----------
  const canvas = document.getElementById("pong");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const countdownEl = document.getElementById("countdown");
  const playerScoreEl = document.getElementById("player-score");
  const aiScoreEl = document.getElementById("ai-score");
  const endMessage = document.getElementById("end-message");
  const winnerText = document.getElementById("winner-text");
  const backMenuBtn = document.getElementById("back-menu");

  const state = { running:false, difficulty:"medio", playerScore:0, aiScore:0, target:3, ended:false };
  const paddle = { x:10, w:12, h:90, y:canvas.height/2-45 };
  const aiPaddle = { x:canvas.width-22, w:12, h:90, y:canvas.height/2-45 };
  const ball = { x:canvas.width/2, y:canvas.height/2, r:8, vx:0, vy:0, speed:5 };
  let countdownTimer=null;
  let speedupTimer=null;

  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

  function resetBall(dir=(Math.random()<0.5?1:-1)){
    ball.x=canvas.width/2; ball.y=canvas.height/2;
    const angle=(Math.random()*Math.PI/4)-(Math.PI/8);
    ball.speed = state.difficulty==="dificil"?7:state.difficulty==="medio"?5.5:4;
    ball.vx=ball.speed*dir*Math.cos(angle);
    ball.vy=ball.speed*Math.sin(angle);
  }

  function drawScene(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#050507"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#222"; for(let y=0;y<canvas.height;y+=24) ctx.fillRect(canvas.width/2-2,y+6,4,12);
    ctx.fillStyle="#fff"; ctx.fillRect(paddle.x,paddle.y,paddle.w,paddle.h); ctx.fillRect(aiPaddle.x,aiPaddle.y,aiPaddle.w,aiPaddle.h);
    const g = ctx.createRadialGradient(ball.x,ball.y,1,ball.x,ball.y,40); g.addColorStop(0,"rgba(255,255,255,1)"); g.addColorStop(1,"rgba(255,255,255,0)"); ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#00ff9f"; ctx.font="28px 'Press Start 2P'"; ctx.fillText(state.playerScore,canvas.width/2-80,40); ctx.fillText(state.aiScore,canvas.width/2+40,40);
  }

  function aiMove(){
    let react=state.difficulty==="facil"?0.02:state.difficulty==="medio"?0.07:0.12;
    let error=state.difficulty==="facil"?(Math.random()*0.6-0.3)*120:state.difficulty==="medio"?(Math.random()*0.4-0.2)*60:(Math.random()*0.2-0.1)*30;
    if(state.difficulty==="dificil" && ball.vx>0){
      const t=Math.abs((aiPaddle.x-ball.x)/(ball.vx||0.0001));
      let predicted=ball.y+ball.vy*t;
      while(predicted<0||predicted>canvas.height){ if(predicted<0) predicted=-predicted; if(predicted>canvas.height) predicted=2*canvas.height-predicted; }
      aiPaddle.y+=(predicted-aiPaddle.h/2-aiPaddle.y)*react;
    } else {
      aiPaddle.y+=((ball.y+error)-(aiPaddle.y+aiPaddle.h/2))*react;
      if(state.difficulty==="facil" && Math.random()<0.004) aiPaddle.y+=(Math.random()*220-110);
    }
    aiPaddle.y=clamp(aiPaddle.y,0,canvas.height-aiPaddle.h);
  }

  function handleCollisions(){
    if(ball.y-ball.r<0){ ball.y=ball.r; ball.vy*=-1; }
    if(ball.y+ball.r>canvas.height){ ball.y=canvas.height-ball.r; ball.vy*=-1; }
    if(ball.x-ball.r<paddle.x+paddle.w && ball.y>paddle.y && ball.y<paddle.y+paddle.h){
      const rel=(ball.y-(paddle.y+paddle.h/2))/(paddle.h/2);
      const angle=rel*Math.PI/4;
      const speed=Math.min(12,Math.hypot(ball.vx,ball.vy)*1.05);
      ball.vx=Math.abs(speed*Math.cos(angle));
      ball.vy=speed*Math.sin(angle);
      ball.x=paddle.x+paddle.w+ball.r+0.5;
    }
    if(ball.x+ball.r>aiPaddle.x && ball.y>aiPaddle.y && ball.y<aiPaddle.y+aiPaddle.h){
      const rel=(ball.y-(aiPaddle.y+aiPaddle.h/2))/(aiPaddle.h/2);
      const angle=rel*Math.PI/4;
      const speed=Math.min(12,Math.hypot(ball.vx,ball.vy)*1.05);
      ball.vx=-Math.abs(speed*Math.cos(angle));
      ball.vy=speed*Math.sin(angle);
      ball.x=aiPaddle.x-ball.r-0.5;
    }
  }

  function checkScore(){
    playerScoreEl.textContent=state.playerScore;
    aiScoreEl.textContent=state.aiScore;
    if(state.playerScore>=state.target || state.aiScore>=state.target){
      state.running=false; state.ended=true;
      winnerText.textContent=state.playerScore>state.aiScore?"🎉 Você venceu!":"😢 Você perdeu!";
      endMessage.classList.remove("hidden");
    }
  }

  function hideEndMessage(){
    endMessage.classList.add("hidden");
    winnerText.textContent="";
    state.ended=false;
  }

  function startCountdown(seconds=3, dir=(Math.random()<0.5?1:-1)){
    let n=seconds;
    countdownEl.textContent=n; countdownEl.style.visibility="visible";
    if(countdownTimer) clearInterval(countdownTimer);
    countdownTimer=setInterval(()=>{
      n--;
      countdownEl.textContent=n>0?n:"GO!";
      if(n<0){ clearInterval(countdownTimer); countdownEl.style.visibility="hidden"; resetBall(dir); state.running=true; }
    },1000);
  }

  function loop(){
    if(state.ended){ drawScene(); return; }
    if(state.running){
      ball.x+=ball.vx; ball.y+=ball.vy;
      handleCollisions(); aiMove();
      if(ball.x<0){ state.aiScore++; checkScore(); if(!state.ended) startCountdown(3,1); }
      else if(ball.x>canvas.width){ state.playerScore++; checkScore(); if(!state.ended) startCountdown(3,-1); }
    }
    drawScene(); requestAnimationFrame(loop);
  }

  resetBall(); loop();

  canvas.addEventListener("mousemove", e=>{ const rect=canvas.getBoundingClientRect(); paddle.y=clamp(e.clientY-rect.top-paddle.h/2,0,canvas.height-paddle.h); });
  canvas.addEventListener("touchmove", e=>{ if(!e.touches||!e.touches[0]) return; const rect=canvas.getBoundingClientRect(); paddle.y=clamp(e.touches[0].clientY-rect.top-paddle.h/2,0,canvas.height-paddle.h); },{passive:true});

  document.querySelectorAll(".diff-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".diff-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      state.difficulty=btn.dataset.diff;
      resetGame();
      startCountdown(3,Math.random()<0.5?1:-1);
    });
  });

  function resetGame(){
    state.running=false; state.ended=false; state.playerScore=0; state.aiScore=0;
    paddle.y=canvas.height/2-paddle.h/2; aiPaddle.y=canvas.height/2-aiPaddle.h/2;
    resetBall();
    if(countdownTimer) clearInterval(countdownTimer);
    if(speedupTimer) clearInterval(speedupTimer);
    playerScoreEl.textContent="0"; aiScoreEl.textContent="0";
    hideEndMessage();

    if(state.difficulty==="dificil"){
      speedupTimer=setInterval(()=>{ ball.speed+=0.2; },1000);
    }
  }

  backMenuBtn.addEventListener("click", ()=>{
    resetGame();
    showPage("menu");
  });

  window._IA_PROJECT={ state, ball, paddle, aiPaddle };
});
