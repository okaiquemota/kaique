/* ------------------------------------------------------------------
   A paleta chapada, do lado do canvas.
   ------------------------------------------------------------------
   O CSS resolve a cor por token (--magenta, --limao...), mas canvas
   nao le variavel de CSS: cada `fillStyle` quer um valor cru. Entao
   as mesmas sete cores vivem aqui uma vez so, e os seis jogos leem
   deste objeto — trocar a paleta continua sendo um lugar so, nao
   quarenta `fillStyle` espalhados pelo arquivo.

   Precisa casar com o :root de css/paginas.css.
   ------------------------------------------------------------------ */
const PALETA = {
  vacuo:   '#000000',
  creme:   '#ece2d0',
  magenta: '#ff2d87',
  laranja: '#ff6a13',
  coral:   '#ff9a76',
  limao:   '#d4ff3f',
  azul:    '#2b5cff',
  /* a casca do kiwi: e fruta cortada, nao interface */
  casca:   '#8b4513',
  /* creme rebaixado, para grade e faixa de pista */
  veu:      (a) => `rgba(236, 226, 208, ${a})`
};

/* ---------------------------- Genio ---------------------------- */
(() => {
  'use strict';

  const painel = document.getElementById('genio');
  const pads   = painel ? [...painel.querySelectorAll('.pad')] : [];
  if (pads.length !== 4) return;

  const elRodada  = document.getElementById('rodada');
  const elRecorde = document.getElementById('recorde');
  const elMsg     = document.getElementById('msg');
  const btComecar = document.getElementById('comecar');
  const btSom     = document.getElementById('som');

  const JOGO = 'genio';
  const TONS = [329.63, 415.30, 493.88, 659.25];

  let seq = [], passo = 0, aceitando = false, mostrando = false;
  let som = true, audio = null;

  function bipe(i, ms){
    if (!som) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator();
      const vol = audio.createGain();
      const fim = audio.currentTime + ms / 1000;
      osc.type = 'triangle';
      osc.frequency.value = TONS[i];
      vol.gain.setValueAtTime(0.0001, audio.currentTime);
      vol.gain.exponentialRampToValueAtTime(0.2, audio.currentTime + 0.012);
      vol.gain.exponentialRampToValueAtTime(0.0001, fim);
      osc.connect(vol).connect(audio.destination);
      osc.start();
      osc.stop(fim + 0.03);
    } catch {}
  }

  async function acender(i, ms){
    pads[i].classList.add('on');
    bipe(i, ms);
    await espera(ms);
    pads[i].classList.remove('on');
  }

  function marcar(){
    elRodada.textContent  = String(seq.length);
    elRecorde.textContent = String(Placar.melhor(JOGO));
  }

  function travar(v){ pads.forEach((pad) => { pad.disabled = v; }); }

  async function mostrar(){
    mostrando = true;
    aceitando = false;
    travar(true);
    elMsg.textContent = 'Presta atenção…';
    await espera(620);
    const aceso = semMovimento ? 520 : Math.max(220, 520 - seq.length * 18);
    for (const i of seq){
      await acender(i, aceso);
      await espera(Math.max(70, aceso * 0.34));
    }
    mostrando = false;
    aceitando = true;
    passo = 0;
    travar(false);
    elMsg.textContent = 'Sua vez.';
  }

  function proxima(){
    seq.push(Math.floor(Math.random() * 4));
    marcar();
    mostrar();
  }

  function errou(){
    aceitando = false;
    travar(true);
    const chegou = seq.length - 1;
    Placar.guardar(JOGO, chegou);
    marcar();
    Placar.enviar(JOGO, chegou).then((topo) => ranking(JOGO, topo));
    elMsg.textContent = chegou === 0
      ? 'Logo de cara. Tenta de novo.'
      : 'Errou na rodada ' + seq.length + '. Chegou a ' + chegou + '.';
    painel.classList.add('tremer');
    setTimeout(() => painel.classList.remove('tremer'), 420);
    btComecar.textContent = 'De novo';
    btComecar.disabled = false;
  }

  async function clicou(i){
    if (!aceitando) return;
    const certo = seq[passo] === i;
    acender(i, 170);
    if (!certo){ errou(); return; }
    passo += 1;
    if (passo === seq.length){
      aceitando = false;
      Placar.guardar(JOGO, seq.length);
      marcar();
      elMsg.textContent = 'Boa!';
      await espera(520);
      proxima();
    }
  }

  pads.forEach((pad, i) => pad.addEventListener('click', () => clicou(i)));

  btComecar.addEventListener('click', () => {
    if (mostrando) return;
    seq = [];
    passo = 0;
    btComecar.disabled = true;
    btComecar.textContent = 'Jogando';
    proxima();
  });

  btSom.addEventListener('click', () => {
    som = !som;
    btSom.setAttribute('aria-pressed', String(som));
    btSom.textContent = som ? 'Som ligado' : 'Som mudo';
  });

  painel.closest('dialog')?.addEventListener('jogo:parar', () => {
    seq = [];
    passo = 0;
    aceitando = false;
    mostrando = false;
    travar(true);
    marcar();
    elMsg.textContent = 'Aperta começar.';
    btComecar.disabled = false;
    btComecar.textContent = 'Começar';
  });

  travar(true);
  marcar();
})();

/* --------------------------- Cobrinha --------------------------- */
(() => {
  'use strict';

  const painel = document.getElementById('cobrinha');
  const tela   = document.getElementById('c-tela');
  if (!painel || !tela) return;

  const pincel    = tela.getContext('2d');
  const elPontos  = document.getElementById('c-pontos');
  const elRecorde = document.getElementById('c-recorde');
  const elMsg     = document.getElementById('c-msg');
  const btComecar = document.getElementById('c-comecar');
  const dpad      = document.getElementById('c-dpad');

  const JOGO = 'cobrinha';
  const N    = 19;
  const CEL  = tela.width / N;

  const COR = {
    fundo:  PALETA.vacuo,
    grade:  PALETA.veu(0.06),
    corpo:  PALETA.azul,
    cabeca: PALETA.limao,
    fruta:  PALETA.magenta
  };

  const LADOS = {
    cima:  { x:  0, y: -1 },
    baixo: { x:  0, y:  1 },
    esq:   { x: -1, y:  0 },
    dir:   { x:  1, y:  0 }
  };
  const TECLAS = {
    ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esq', ArrowRight: 'dir',
    w: 'cima', s: 'baixo', a: 'esq', d: 'dir',
    W: 'cima', S: 'baixo', A: 'esq', D: 'dir'
  };

  let cobra = [], lado = LADOS.dir, proximo = LADOS.dir;
  let fruta = null, relogio = null, pontos = 0, rodando = false;

  function marcar(){
    elPontos.textContent  = String(pontos);
    elRecorde.textContent = String(Placar.melhor(JOGO));
  }

  function sortearFruta(){
    const livres = [];
    for (let y = 0; y < N; y++){
      for (let x = 0; x < N; x++){
        if (!cobra.some((s) => s.x === x && s.y === y)) livres.push({ x, y });
      }
    }
    return livres.length ? livres[Math.floor(Math.random() * livres.length)] : null;
  }

  function desenhar(){
    pincel.fillStyle = COR.fundo;
    pincel.fillRect(0, 0, tela.width, tela.height);

    pincel.strokeStyle = COR.grade;
    pincel.lineWidth = 1;
    for (let i = 1; i < N; i++){
      pincel.beginPath();
      pincel.moveTo(i * CEL, 0); pincel.lineTo(i * CEL, tela.height);
      pincel.moveTo(0, i * CEL); pincel.lineTo(tela.width, i * CEL);
      pincel.stroke();
    }

    if (fruta){
      pincel.fillStyle = COR.fruta;
      pincel.fillRect(fruta.x * CEL + 4, fruta.y * CEL + 4, CEL - 8, CEL - 8);
    }

    cobra.forEach((s, i) => {
      pincel.fillStyle = i === 0 ? COR.cabeca : COR.corpo;
      pincel.fillRect(s.x * CEL + 1, s.y * CEL + 1, CEL - 2, CEL - 2);
    });
  }

  function ritmo(){
    return Math.max(72, 165 - pontos * 4);
  }

  function bater(){
    clearInterval(relogio);
    relogio = null;
    rodando = false;
    Placar.guardar(JOGO, pontos);
    marcar();
    Placar.enviar(JOGO, pontos).then((topo) => ranking(JOGO, topo));
    elMsg.textContent = pontos === 0
      ? 'Zero. Tenta de novo.'
      : 'Bateu. Ficou com ' + pontos + '.';
    if (!semMovimento){
      painel.classList.add('tremer');
      setTimeout(() => painel.classList.remove('tremer'), 420);
    }
    btComecar.textContent = 'De novo';
    btComecar.disabled = false;
  }

  function passo(){
    lado = proximo;
    const cabeca = { x: cobra[0].x + lado.x, y: cobra[0].y + lado.y };

    const bateuParede = cabeca.x < 0 || cabeca.y < 0 || cabeca.x >= N || cabeca.y >= N;
    const bateuNela   = cobra.some((s) => s.x === cabeca.x && s.y === cabeca.y);
    if (bateuParede || bateuNela){ bater(); return; }

    cobra.unshift(cabeca);

    if (fruta && cabeca.x === fruta.x && cabeca.y === fruta.y){
      pontos += 1;
      /* grava a cada fruta, nao so na morte: senao o painel mostra
         recorde 0 enquanto voce ja tem pontos, e quem fecha a aba sem
         bater perde a partida inteira */
      Placar.guardar(JOGO, pontos);
      marcar();
      fruta = sortearFruta();
      clearInterval(relogio);
      relogio = setInterval(passo, ritmo());
    } else {
      cobra.pop();
    }

    desenhar();
  }

  function virar(nome){
    const novo = LADOS[nome];
    if (!novo || !rodando) return;
    /* dar ré em cima do próprio pescoço é morte instantânea e nunca é
       o que a pessoa quis fazer, então simplesmente ignora */
    if (novo.x === -lado.x && novo.y === -lado.y) return;
    proximo = novo;
  }

  /* posicao de descanso: sem isto o tabuleiro abre vazio e parece
     quebrado antes de alguem apertar comecar */
  function armar(){
    const meio = Math.floor(N / 2);
    cobra   = [{ x: meio, y: meio }, { x: meio - 1, y: meio }, { x: meio - 2, y: meio }];
    lado    = LADOS.dir;
    proximo = LADOS.dir;
    pontos  = 0;
    fruta   = sortearFruta();
  }

  function comecar(){
    armar();
    rodando = true;
    marcar();
    desenhar();
    elMsg.textContent = 'Vai!';
    btComecar.disabled = true;
    btComecar.textContent = 'Jogando';
    clearInterval(relogio);
    relogio = setInterval(passo, ritmo());
  }

  btComecar.addEventListener('click', comecar);

  dpad.addEventListener('click', (e) => {
    const bt = e.target.closest('[data-dir]');
    if (bt) virar(bt.dataset.dir);
  });

  document.addEventListener('keydown', (e) => {
    const nome = TECLAS[e.key];
    if (!nome || !rodando) return;
    e.preventDefault();
    virar(nome);
  });

  /* deslizar o dedo na tela do jogo */
  let toque = null;
  tela.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    toque = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  tela.addEventListener('touchend', (e) => {
    if (!toque) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - toque.x;
    const dy = t.clientY - toque.y;
    toque = null;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    virar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'dir' : 'esq') : (dy > 0 ? 'baixo' : 'cima'));
  }, { passive: true });

  /* trocar de aba não pode custar a partida */
  document.addEventListener('visibilitychange', () => {
    if (!rodando) return;
    if (document.hidden){
      clearInterval(relogio);
      relogio = null;
      elMsg.textContent = 'Pausado.';
    } else if (!relogio){
      relogio = setInterval(passo, ritmo());
      elMsg.textContent = 'Vai!';
    }
  });

  painel.closest('dialog')?.addEventListener('jogo:parar', () => {
    clearInterval(relogio);
    relogio = null;
    rodando = false;
    armar();
    marcar();
    desenhar();
    elMsg.textContent = 'Setas do teclado, ou deslize o dedo.';
    btComecar.disabled = false;
    btComecar.textContent = 'Começar';
  });

  armar();
  marcar();
  desenhar();
})();

/* --------------------------- Fuga 208 --------------------------- */
(() => {
  'use strict';

  const painel = document.getElementById('corrida');
  const tela = document.getElementById('r-tela');
  if (!painel || !tela) return;

  const pincel = tela.getContext('2d');
  const elPontos = document.getElementById('r-pontos');
  const elRecorde = document.getElementById('r-recorde');
  const elMsg = document.getElementById('r-msg');
  const btComecar = document.getElementById('r-comecar');
  const dpad = document.getElementById('r-dpad');

  const JOGO = 'corrida';
  let pontos = 0, rodando = false, animationId = null;

  // Pista
  const LARGURA = tela.width;
  const ALTURA = tela.height;
  const FAIXAS = [LARGURA / 6, LARGURA / 2, (LARGURA * 5) / 6];
  let offsetFaixa = 0;
  let velocidade = 4;

  // Carro (Peugeot 208)
  const CAR_W = 40;
  const CAR_H = 76;
  let faixaAtual = 1;
  let carroX = FAIXAS[faixaAtual];
  const carroY = ALTURA - CAR_H - 20;

  // Obstáculos (Cones)
  let cones = [];
  let frames = 0;

  function marcar(){
    elPontos.textContent = String(pontos);
    elRecorde.textContent = String(Placar.melhor(JOGO));
  }

  function desenharCarro(x, y) {
    pincel.save();
    pincel.translate(x, y);
    
    // Corpo branco do 208
    pincel.fillStyle = PALETA.creme;
    pincel.beginPath();
    pincel.roundRect(-CAR_W/2, 0, CAR_W, CAR_H, 8);
    pincel.fill();
    
    // Teto panorâmico (Griffe)
    pincel.fillStyle = PALETA.vacuo;
    pincel.fillRect(-CAR_W/2 + 4, 15, CAR_W - 8, 30);
    
    // Para-brisa traseiro
    pincel.fillRect(-CAR_W/2 + 6, CAR_H - 15, CAR_W - 12, 10);
    
    // DRL "dente de sabre" (assinatura do 208)
    pincel.fillStyle = PALETA.limao;
    pincel.fillRect(-CAR_W/2 + 2, 2, 4, 15);
    pincel.fillRect(CAR_W/2 - 6, 2, 4, 15);
    
    // Lanternas traseiras (garras de leão)
    pincel.fillStyle = PALETA.magenta;
    pincel.fillRect(-CAR_W/2 + 2, CAR_H - 6, 8, 4);
    pincel.fillRect(CAR_W/2 - 10, CAR_H - 6, 8, 4);
    
    pincel.restore();
  }

  function desenharCone(x, y) {
    const size = 24;
    pincel.save();
    pincel.translate(x, y);
    
    // Laranja/Amarelo do cone
    pincel.fillStyle = PALETA.laranja; 
    pincel.beginPath();
    pincel.moveTo(0, -size/2);
    pincel.lineTo(-size/2, size/2);
    pincel.lineTo(size/2, size/2);
    pincel.fill();
    
    // Faixa branca do cone
    pincel.fillStyle = PALETA.creme;
    pincel.beginPath();
    pincel.moveTo(-size/4.5, -size/6);
    pincel.lineTo(size/4.5, -size/6);
    pincel.lineTo(size/3, size/4);
    pincel.lineTo(-size/3, size/4);
    pincel.fill();
    
    pincel.restore();
  }

  function desenhar() {
    // Asfalto
    pincel.fillStyle = PALETA.vacuo;
    pincel.fillRect(0, 0, LARGURA, ALTURA);

    // Faixas da pista
    pincel.strokeStyle = PALETA.veu(0.16);
    pincel.lineWidth = 4;
    pincel.setLineDash([20, 20]);
    pincel.lineDashOffset = -offsetFaixa;
    
    pincel.beginPath();
    pincel.moveTo(LARGURA / 3, 0); pincel.lineTo(LARGURA / 3, ALTURA);
    pincel.moveTo((LARGURA * 2) / 3, 0); pincel.lineTo((LARGURA * 2) / 3, ALTURA);
    pincel.stroke();

    // Obstáculos
    cones.forEach(c => desenharCone(c.x, c.y));

    // Carro (suavizando o movimento lateral)
    carroX += (FAIXAS[faixaAtual] - carroX) * 0.2;
    desenharCarro(carroX, carroY);
  }

  function bater() {
    rodando = false;
    cancelAnimationFrame(animationId);
    Placar.guardar(JOGO, pontos);
    marcar();
    Placar.enviar(JOGO, pontos).then((topo) => ranking(JOGO, topo));
    elMsg.textContent = pontos === 0 ? 'Bateu no primeiro cone!' : 'Fim de prova. Desviou de ' + pontos + '.';
    const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!semMovimento) {
      painel.classList.add('tremer');
      setTimeout(() => painel.classList.remove('tremer'), 420);
    }
    btComecar.textContent = 'De novo';
    btComecar.disabled = false;
  }

  function loop() {
    if (!rodando) return;
    frames++;
    offsetFaixa += velocidade;
    
    // Aumenta a velocidade sutilmente
    if (frames % 60 === 0) velocidade += 0.05;

    // Criar cones
    if (frames % Math.max(25, Math.floor(90 - velocidade * 4)) === 0) {
       let faixaCone = Math.floor(Math.random() * 3);
       cones.push({ x: FAIXAS[faixaCone], y: -30, faixa: faixaCone });
       
       // As vezes joga dois cones (se já estiver rápido)
       if (Math.random() > 0.7 && velocidade > 6) {
         let outraFaixa = (faixaCone + 1 + Math.floor(Math.random() * 2)) % 3;
         cones.push({ x: FAIXAS[outraFaixa], y: -30, faixa: outraFaixa });
       }
    }

    // Atualiza cones e checa colisão
    for (let i = cones.length - 1; i >= 0; i--) {
      let c = cones[i];
      c.y += velocidade;
      
      // Colisão (hitbox simples)
      if (c.y > carroY && c.y < carroY + CAR_H && Math.abs(c.x - carroX) < CAR_W / 1.5) {
        bater();
        return;
      }

      // Passou do cone (pontuou)
      if (c.y > ALTURA + 30) {
        cones.splice(i, 1);
        pontos++;
        marcar();
      }
    }

    desenhar();
    animationId = requestAnimationFrame(loop);
  }

  function virar(dir) {
    if (!rodando) return;
    if (dir === 'esq' && faixaAtual > 0) faixaAtual--;
    if (dir === 'dir' && faixaAtual < 2) faixaAtual++;
  }

  function armar() {
    pontos = 0;
    velocidade = 5;
    frames = 0;
    cones = [];
    faixaAtual = 1;
    carroX = FAIXAS[faixaAtual];
  }

  function comecar() {
    armar();
    rodando = true;
    marcar();
    elMsg.textContent = 'Vambora!';
    btComecar.disabled = true;
    btComecar.textContent = 'Correndo';
    if (animationId) cancelAnimationFrame(animationId);
    loop();
  }

  btComecar.addEventListener('click', comecar);

  dpad.addEventListener('click', (e) => {
    const bt = e.target.closest('[data-dir]');
    if (bt) virar(bt.dataset.dir);
  });

  document.addEventListener('keydown', (e) => {
    if (!rodando) return;
    const esq = e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A';
    const dir = e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D';
    if (!esq && !dir) return;
    /* sem isto a seta tambem rola a tela do jogo enquanto voce joga */
    e.preventDefault();
    virar(esq ? 'esq' : 'dir');
  });

  // Toque nas laterais da tela do jogo
  tela.addEventListener('touchstart', (e) => {
    if (!rodando) return;
    const t = e.changedTouches[0];
    const rect = tela.getBoundingClientRect();
    const x = t.clientX - rect.left;
    if (x < rect.width / 2) virar('esq');
    else virar('dir');
    e.preventDefault();
  }, { passive: false });

  // Pausa se mudar de aba
  document.addEventListener('visibilitychange', () => {
    if (!rodando) return;
    if (document.hidden) {
      rodando = false;
      cancelAnimationFrame(animationId);
      elMsg.textContent = 'Pausado.';
      btComecar.disabled = false;
      btComecar.textContent = 'Continuar';
    }
  });

  painel.closest('dialog')?.addEventListener('jogo:parar', () => {
    rodando = false;
    cancelAnimationFrame(animationId);
    armar();
    marcar();
    desenhar();
    elMsg.textContent = 'Setas do teclado, ou toque nas laterais.';
    btComecar.disabled = false;
    btComecar.textContent = 'Começar';
  });

  armar();
  marcar();
  desenhar();
})();

/* --------------------------- Flick (Mira) --------------------------- */
(() => {
  'use strict';

  const painel = document.getElementById('mira');
  const tela = document.getElementById('a-tela');
  if (!painel || !tela) return;

  const pincel = tela.getContext('2d');
  const elPontos = document.getElementById('a-pontos');
  const elRecorde = document.getElementById('a-recorde');
  const elMsg = document.getElementById('a-msg');
  const btComecar = document.getElementById('a-comecar');

  const JOGO = 'mira';
  let pontos = 0, rodando = false, animationId = null;
  let alvo = null;

  function marcar() {
    elPontos.textContent = String(pontos);
    elRecorde.textContent = String(Placar.melhor(JOGO));
  }

  function gerarAlvo() {
    // Fica menor e mais rápido conforme você avança
    const raio = Math.max(12, 35 - pontos * 0.4);
    const x = raio + Math.random() * (tela.width - raio * 2);
    const y = raio + Math.random() * (tela.height - raio * 2);
    const tempoDeVida = Math.max(500, 2000 - pontos * 40); // Começa em 2s, desce até 0.5s

    alvo = { x, y, r: raio, nasceu: performance.now(), vida: tempoDeVida };
  }

  function desenhar(timestamp) {
    // Fundo
    pincel.fillStyle = PALETA.vacuo;
    pincel.fillRect(0, 0, tela.width, tela.height);

    if (!alvo) return;

    const idade = timestamp - alvo.nasceu;
    
    // Se o tempo acabar, você perde
    if (idade > alvo.vida) {
      bater('Demorou demais! O alvo sumiu.');
      return;
    }

    const prop = Math.max(0, 1 - (idade / alvo.vida));

    // Anel externo que vai fechando (indicador de tempo)
    pincel.strokeStyle = PALETA.laranja;
    pincel.lineWidth = 3;
    pincel.beginPath();
    pincel.arc(alvo.x, alvo.y, alvo.r + (prop * 20), 0, Math.PI * 2);
    pincel.stroke();

    // Alvo principal
    pincel.fillStyle = PALETA.magenta;
    pincel.beginPath();
    pincel.arc(alvo.x, alvo.y, alvo.r, 0, Math.PI * 2);
    pincel.fill();
    
    // Miolo do alvo
    pincel.fillStyle = PALETA.creme;
    pincel.beginPath();
    pincel.arc(alvo.x, alvo.y, alvo.r * 0.4, 0, Math.PI * 2);
    pincel.fill();
  }

  function loop(timestamp) {
    if (!rodando) return;
    desenhar(timestamp);
    animationId = requestAnimationFrame(loop);
  }

  function bater(motivo) {
    rodando = false;
    cancelAnimationFrame(animationId);
    Placar.guardar(JOGO, pontos);
    marcar();
    Placar.enviar(JOGO, pontos).then((topo) => ranking(JOGO, topo));
    
    elMsg.textContent = pontos === 0 ? motivo : motivo + ' Acertou ' + pontos + '.';
    const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!semMovimento) {
      painel.classList.add('tremer');
      setTimeout(() => painel.classList.remove('tremer'), 420);
    }
    btComecar.textContent = 'De novo';
    btComecar.disabled = false;
  }

  function comecar() {
    pontos = 0;
    rodando = true;
    marcar();
    elMsg.textContent = 'Foco...';
    btComecar.disabled = true;
    btComecar.textContent = 'Atirando';
    gerarAlvo();
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
  }

  btComecar.addEventListener('click', comecar);

  // pointerdown funciona tanto pra clique de mouse quanto pra toque no celular
  tela.addEventListener('pointerdown', (e) => {
    if (!rodando) return;
    e.preventDefault(); // Evita scroll no mobile

    const rect = tela.getBoundingClientRect();
    const scaleX = tela.width / rect.width;
    const scaleY = tela.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (alvo) {
      // Pitágoras pra descobrir se o clique foi dentro do círculo
      const dist = Math.hypot(clickX - alvo.x, clickY - alvo.y);
      if (dist <= alvo.r + 5) { // +5 de "folga" pra ajudar no clique
        pontos++;
        marcar();
        gerarAlvo();
      } else {
        bater('Errou o tiro!');
      }
    }
  });

  // Pausa se mudar de aba
  document.addEventListener('visibilitychange', () => {
    if (!rodando) return;
    if (document.hidden) {
      rodando = false;
      cancelAnimationFrame(animationId);
      elMsg.textContent = 'Pausado.';
      btComecar.disabled = false;
      btComecar.textContent = 'Continuar';
      // Ajusta o tempo do alvo para não morrer injustamente ao voltar
      if (alvo) alvo.nasceu = performance.now() - (alvo.vida * 0.5); 
    }
  });

  painel.closest('dialog')?.addEventListener('jogo:parar', () => {
    rodando = false;
    cancelAnimationFrame(animationId);
    pontos = 0;
    alvo = null;
    marcar();
    pincel.fillStyle = PALETA.vacuo;
    pincel.fillRect(0, 0, tela.width, tela.height);
    elMsg.textContent = 'Clica no alvo. Errou ou demorou, morre.';
    btComecar.disabled = false;
    btComecar.textContent = 'Começar';
  });

  marcar();
  pincel.fillStyle = PALETA.vacuo;
  pincel.fillRect(0, 0, tela.width, tela.height);
})();

/* --------------------------- Flappy Kiwi --------------------------- */
(() => {
  'use strict';

  const painel = document.getElementById('kiwi');
  const tela = document.getElementById('k-tela');
  if (!painel || !tela) return;

  const pincel = tela.getContext('2d');
  const elPontos = document.getElementById('k-pontos');
  const elRecorde = document.getElementById('k-recorde');
  const elMsg = document.getElementById('k-msg');
  const btComecar = document.getElementById('k-comecar');

  const JOGO = 'kiwi';
  let pontos = 0, rodando = false, animationId = null;
  let frames = 0;

  // Passarinho (Kiwi)
  const KIWI = { x: 60, y: 150, r: 14, v: 0, gravidade: 0.28, pulo: -5.8 };
  
  // Canos
  let canos = [];
  const LARGURA_CANO = 44;
  const BURACO = 125; // Se achar muito difícil, aumenta esse valor pra 140
  const VELOCIDADE = 2.5;

  function marcar() {
    elPontos.textContent = String(pontos);
    elRecorde.textContent = String(Placar.melhor(JOGO));
  }

  function desenharKiwi(x, y) {
    pincel.save();
    pincel.translate(x, y);
    
    // Inclina o passarinho baseado na velocidade da queda
    const rotacao = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (KIWI.v * 0.1)));
    pincel.rotate(rotacao);
    
    // Corpo (marrom por fora, verde por dentro simulando a fruta cortada)
    pincel.fillStyle = PALETA.casca;
    pincel.beginPath();
    pincel.arc(0, 0, KIWI.r, 0, Math.PI * 2);
    pincel.fill();
    
    pincel.fillStyle = PALETA.limao;   // polpa
    pincel.beginPath();
    pincel.arc(0, 0, KIWI.r - 3, 0, Math.PI * 2);
    pincel.fill();
    
    // Olho
    pincel.fillStyle = PALETA.vacuo;
    pincel.beginPath();
    pincel.arc(4, -4, 2.5, 0, Math.PI * 2);
    pincel.fill();
    
    // Biquinho longo do kiwi
    pincel.fillStyle = PALETA.laranja;
    pincel.beginPath();
    pincel.moveTo(8, -1);
    pincel.lineTo(22, 2);
    pincel.lineTo(8, 3);
    pincel.fill();

    pincel.restore();
  }

  function desenhar() {
    // Fundo
    pincel.fillStyle = PALETA.vacuo;
    pincel.fillRect(0, 0, tela.width, tela.height);

    // Canos (Pintados com as cores do site)
    canos.forEach(cano => {
      // Muda a cor do cano depois que você passa por ele pra dar um feedback visual
      pincel.fillStyle = cano.passou ? PALETA.magenta : PALETA.azul;
      
      // Topo
      pincel.fillRect(cano.x, 0, LARGURA_CANO, cano.topo);
      // Base
      pincel.fillRect(cano.x, cano.topo + BURACO, LARGURA_CANO, tela.height - (cano.topo + BURACO));
      
      // Detalhe na ponta dos canos pra dar estilo
      pincel.fillStyle = PALETA.vacuo;
      pincel.fillRect(cano.x, cano.topo - 6, LARGURA_CANO, 6);
      pincel.fillRect(cano.x, cano.topo + BURACO, LARGURA_CANO, 6);
    });

    desenharKiwi(KIWI.x, KIWI.y);
  }

  function pular() {
    if (!rodando) return;
    KIWI.v = KIWI.pulo;
  }

  function bater() {
    rodando = false;
    cancelAnimationFrame(animationId);
    Placar.guardar(JOGO, pontos);
    marcar();
    Placar.enviar(JOGO, pontos).then((topo) => ranking(JOGO, topo));
    
    elMsg.textContent = pontos === 0 ? 'Não decolou!' : 'Caiu. Fez ' + pontos + ' pontos.';
    const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!semMovimento) {
      painel.classList.add('tremer');
      setTimeout(() => painel.classList.remove('tremer'), 420);
    }
    btComecar.textContent = 'De novo';
    btComecar.disabled = false;
  }

  function loop() {
    if (!rodando) return;
    frames++;

    // Física do Kiwi
    KIWI.v += KIWI.gravidade;
    KIWI.y += KIWI.v;

    // Bateu no chão ou no teto
    if (KIWI.y + KIWI.r >= tela.height || KIWI.y - KIWI.r <= 0) {
      bater();
      return;
    }

    // Criação de canos
    if (frames % 90 === 0) {
      const minCano = 40;
      const maxCano = tela.height - BURACO - 40;
      const alturaTopo = Math.floor(Math.random() * (maxCano - minCano + 1) + minCano);
      canos.push({ x: tela.width, topo: alturaTopo, passou: false });
    }

    // Atualiza canos e checa colisão
    for (let i = canos.length - 1; i >= 0; i--) {
      let c = canos[i];
      c.x -= VELOCIDADE;

      // Hitbox simples (caixa vs círculo)
      let bateuX = KIWI.x + KIWI.r > c.x && KIWI.x - KIWI.r < c.x + LARGURA_CANO;
      let bateuY = KIWI.y - KIWI.r < c.topo || KIWI.y + KIWI.r > c.topo + BURACO;
      
      if (bateuX && bateuY) {
        bater();
        return;
      }

      // Pontuou (se o meio do pássaro passou o meio do cano)
      if (c.x + LARGURA_CANO < KIWI.x && !c.passou) {
        c.passou = true;
        pontos++;
        marcar();
      }

      // Limpa os canos que saíram da tela pra não explodir a memória
      if (c.x + LARGURA_CANO < 0) {
        canos.splice(i, 1);
      }
    }

    desenhar();
    animationId = requestAnimationFrame(loop);
  }

  function comecar() {
    pontos = 0;
    frames = 0;
    canos = [];
    KIWI.y = tela.height / 2;
    KIWI.v = 0;
    rodando = true;
    marcar();
    elMsg.textContent = 'Voando!';
    btComecar.disabled = true;
    btComecar.textContent = 'Jogando';
    if (animationId) cancelAnimationFrame(animationId);
    pular(); // Dá um pulinho automático pra iniciar a física
    loop();
  }

  btComecar.addEventListener('click', comecar);

  // Controles (Espaço ou Seta pra cima)
  document.addEventListener('keydown', (e) => {
    if (rodando && (e.key === ' ' || e.key === 'ArrowUp')) {
      e.preventDefault();
      pular();
    }
  });
  
  // Toque na área do jogo pra pular no mobile
  tela.addEventListener('pointerdown', (e) => {
    if (rodando) {
      e.preventDefault();
      pular();
    }
  });

  // Pausa se o usuário minimizar o navegador ou mudar de aba
  document.addEventListener('visibilitychange', () => {
    if (!rodando) return;
    if (document.hidden) {
      rodando = false;
      cancelAnimationFrame(animationId);
      elMsg.textContent = 'Pausado.';
      btComecar.disabled = false;
      btComecar.textContent = 'Continuar';
    }
  });

  // Limpa tudo se a pessoa fechar a modal no meio do jogo
  painel.closest('dialog')?.addEventListener('jogo:parar', () => {
    rodando = false;
    cancelAnimationFrame(animationId);
    pontos = 0;
    canos = [];
    KIWI.y = tela.height / 2;
    marcar();
    desenhar();
    elMsg.textContent = 'Espaço, seta pra cima ou toque para pular.';
    btComecar.disabled = false;
    btComecar.textContent = 'Começar';
  });

  // Desenha a cena inicial parada
  marcar();
  desenhar();
})();

/* --------------------------- Movcode Stack (Empilha UI) --------------------------- */
(() => {
  'use strict';

  const painel = document.getElementById('stack');
  const tela = document.getElementById('s-tela');
  if (!painel || !tela) return;

  const pincel = tela.getContext('2d');
  const elPontos = document.getElementById('s-pontos');
  const elRecorde = document.getElementById('s-recorde');
  const elMsg = document.getElementById('s-msg');
  const btComecar = document.getElementById('s-comecar');

  const JOGO = 'stack';
  let pontos = 0, rodando = false, animationId = null;

  const ALTURA_BLOCO = 28;
  /* A paleta do site, e o jogo vai ciclando nela. O creme fica de
     fora: o contorno de cada bloco tambem e creme, e um bloco creme
     nascia sem contorno nenhum. */
  const CORES = [PALETA.azul, PALETA.magenta, PALETA.laranja, PALETA.limao, PALETA.coral];
  
  let blocos = [];
  let blocoAtual = null;
  let offsetAlvo = 0;
  let offsetAtual = 0;

  function marcar() {
    elPontos.textContent = String(pontos);
    elRecorde.textContent = String(Placar.melhor(JOGO));
  }

  function desenharBloco(b) {
    pincel.fillStyle = b.cor;
    pincel.fillRect(b.x, b.y, b.w, ALTURA_BLOCO);
    
    // Contorno brutalista em cada bloco de UI
    pincel.strokeStyle = PALETA.creme;
    pincel.lineWidth = 2;
    pincel.strokeRect(b.x, b.y, b.w, ALTURA_BLOCO);
  }

  function desenhar() {
    // Fundo da prancheta
    pincel.fillStyle = PALETA.vacuo; 
    pincel.fillRect(0, 0, tela.width, tela.height);

    pincel.save();
    
    // Câmera dinâmica: sobe a tela suavemente conforme a torre cresce
    offsetAtual += (offsetAlvo - offsetAtual) * 0.1;
    pincel.translate(0, offsetAtual);

    // Grid sutil no fundo pra dar cara de software de design
    pincel.strokeStyle = PALETA.veu(0.06);
    pincel.lineWidth = 1;
    for (let i = 0; i < tela.height + offsetAtual + 100; i += ALTURA_BLOCO) {
      pincel.beginPath();
      pincel.moveTo(0, tela.height - i);
      pincel.lineTo(tela.width, tela.height - i);
      pincel.stroke();
    }

    // Pilha de blocos fixos
    blocos.forEach(desenharBloco);
    
    // Bloco que está se movendo agora
    if (blocoAtual) desenharBloco(blocoAtual);

    pincel.restore();
  }

  function bater(motivo) {
    rodando = false;
    cancelAnimationFrame(animationId);
    Placar.guardar(JOGO, pontos);
    marcar();
    Placar.enviar(JOGO, pontos).then((topo) => ranking(JOGO, topo));
    
    elMsg.textContent = pontos === 0 ? motivo : motivo + ' Fez ' + pontos + ' andares.';
    const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!semMovimento) {
      painel.classList.add('tremer');
      setTimeout(() => painel.classList.remove('tremer'), 420);
    }
    btComecar.textContent = 'De novo';
    btComecar.disabled = false;
  }

  function soltar() {
    if (!rodando) return;
    
    let topo = blocos[blocos.length - 1];
    
    // "Imã" / Snap: Se acertou muito perto da beirada, gruda perfeito
    let dif = Math.abs(blocoAtual.x - topo.x);
    if (dif < 8) {
      blocoAtual.x = topo.x;
    }

    // Calcula a área de sobreposição
    let esquerda = Math.max(blocoAtual.x, topo.x);
    let direita = Math.min(blocoAtual.x + blocoAtual.w, topo.x + topo.w);
    let overlap = direita - esquerda;

    // Se errou tudo e caiu no vazio
    if (overlap <= 0) {
      bater('Desalinhou e caiu!');
      return;
    }

    pontos++;
    marcar();
    elMsg.textContent = dif < 8 ? 'Perfeito!' : 'Na medida!';
    
    // Corta o bloco e adiciona o pedaço válido à pilha
    blocos.push({ x: esquerda, y: blocoAtual.y, w: overlap, cor: blocoAtual.cor });
    
    // Prepara o próximo bloco a surgir
    let novaCor = CORES[pontos % CORES.length];
    let novaVel = Math.min(10, 3 + pontos * 0.35); // Acelera gradualmente
    
    blocoAtual = {
      // Nasce do lado oposto
      x: blocoAtual.dir === 1 ? 0 : tela.width - overlap,
      y: blocoAtual.y - ALTURA_BLOCO,
      w: overlap,
      cor: novaCor,
      vel: novaVel,
      dir: blocoAtual.dir === 1 ? 1 : -1
    };

    // Ajusta a câmera (quando a torre passa do 6º bloco, começa a subir)
    if (blocos.length > 6) {
      offsetAlvo = (blocos.length - 6) * ALTURA_BLOCO;
    }
  }

  function loop() {
    if (!rodando) return;

    // Faz o bloco deslizar
    blocoAtual.x += blocoAtual.vel * blocoAtual.dir;
    
    // Bateu nas paredes do canvas e rebateu
    if (blocoAtual.x <= 0) {
      blocoAtual.x = 0;
      blocoAtual.dir = 1;
    } else if (blocoAtual.x + blocoAtual.w >= tela.width) {
      blocoAtual.x = tela.width - blocoAtual.w;
      blocoAtual.dir = -1;
    }

    desenhar();
    animationId = requestAnimationFrame(loop);
  }

  function armar() {
    pontos = 0;
    offsetAlvo = 0;
    offsetAtual = 0;
    
    // Bloco fundação (A base larga de UI)
    blocos = [{
      x: 30, 
      y: tela.height - ALTURA_BLOCO, 
      w: tela.width - 60, 
      cor: PALETA.azul 
    }];
    
    blocoAtual = {
      x: 0,
      y: tela.height - ALTURA_BLOCO * 2,
      w: tela.width - 60,
      cor: CORES[1],
      vel: 3.5,
      dir: 1
    };
  }

  function comecar() {
    armar();
    rodando = true;
    marcar();
    elMsg.textContent = 'Vai!';
    btComecar.disabled = true;
    btComecar.textContent = 'Construindo';
    if (animationId) cancelAnimationFrame(animationId);
    loop();
  }

  btComecar.addEventListener('click', comecar);

  // Ação de Soltar: Funciona no toque (mobile) ou mouse
  tela.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    soltar();
  });

  // Ação de soltar: Barra de espaço (teclado)
  document.addEventListener('keydown', (e) => {
    if (rodando && e.key === ' ') {
      e.preventDefault();
      soltar();
    }
  });

  // Proteção: pausar o jogo se for pra outra aba
  document.addEventListener('visibilitychange', () => {
    if (!rodando) return;
    if (document.hidden) {
      rodando = false;
      cancelAnimationFrame(animationId);
      elMsg.textContent = 'Pausado.';
      btComecar.disabled = false;
      btComecar.textContent = 'Continuar';
    }
  });

  painel.closest('dialog')?.addEventListener('jogo:parar', () => {
    rodando = false;
    cancelAnimationFrame(animationId);
    armar();
    marcar();
    desenhar();
    elMsg.textContent = 'Clique, toque ou aperte espaço para soltar.';
    btComecar.disabled = false;
    btComecar.textContent = 'Começar';
  });

  armar();
  marcar();
  desenhar();
})();

/* ------------------------- abrir e fechar jogo ------------------------- */
(() => {
  'use strict';

  const telas = new Map();
  for (const d of document.querySelectorAll('.tela')) telas.set(d.id.replace('tela-', ''), d);
  if (!telas.size) return;

  /* Depois de jogar, o cartucho mostra o numero novo na hora. A
     primeira pintura nao e daqui: quem faz e a camada de movimento,
     contando de 0 ate o recorde quando o carrossel entra na tela. */
  function recordes(){
    for (const el of document.querySelectorAll('[data-rec]')){
      el.textContent = String(Placar.melhor(el.dataset.rec));
    }
  }

  for (const bt of document.querySelectorAll('[data-abre]')){
    bt.addEventListener('click', () => {
      const tela = telas.get(bt.dataset.abre);
      if (!tela) return;
      tela.showModal();

      /* Duas coisas que o showModal sozinho faz errado aqui.

         O foco cai no primeiro elemento focavel, que e o X — e o
         anel de foco entao vira a coisa mais gritante da tela, em
         cima do botao de sair. Ele pertence a acao, nao a saida.

         E o preventScroll importa: sem ele o navegador rola ate o
         botao, que fica embaixo do tabuleiro, e a tela abre com o
         titulo ja cortado no topo. */
      const acao = tela.querySelector('.btn');
      if (acao) acao.focus({ preventScroll: true });
      const corpo = tela.querySelector('.game');
      if (corpo) corpo.scrollTop = 0;

      ranking(bt.dataset.abre);
    });
  }

  for (const [jogo, tela] of telas){
    tela.querySelector('[data-fecha]').addEventListener('click', () => tela.close());

    /* clicar fora do painel fecha, como qualquer tela sobreposta */
    tela.addEventListener('click', (e) => { if (e.target === tela) tela.close(); });

    /* fechar durante a partida encerra de vez em vez de deixar um jogo
       correndo escondido; a pontuacao ja foi guardada pelo caminho */
    tela.addEventListener('close', () => {
      tela.dispatchEvent(new CustomEvent('jogo:parar', { bubbles: true }));
      recordes();
    });
  }
})();

/* ------------------------ carrossel dos jogos ------------------------ */
(() => {
  'use strict';

  const caixa  = document.getElementById('carrossel');
  const trilho = document.getElementById('trilho');
  const pontos = document.getElementById('pontos');
  if (!caixa || !trilho || !pontos) return;

  const vagas = [...trilho.querySelectorAll('.vaga')];
  const pecas = vagas.map((v) => v.querySelector('.peca') || v);
  if (!vagas.length) return;

  const setas  = [...caixa.querySelectorAll('[data-anda]')];
  const parado = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- as paradas e as bolinhas ---------- */

  /* Nem todo cartucho ganha uma parada propria: no fim da linha os
     ultimos aparecem todos de uma vez, no mesmo lugar. Se cada cartucho
     virasse uma bolinha, as ultimas nao levariam a lugar nenhum e a
     seta de voltar travaria encostada na borda. */
  let paradas = [0];   /* onde o trilho realmente consegue encostar */
  let lider = [0];     /* qual cartucho abre cada parada */
  let bolas = [];

  let atual = -1;      /* em que parada o carrossel esta, medido */
  let mira = 0;        /* para qual parada ele foi mandado ir */
  let guiando = 0;     /* ate quando a mira vale mais que a medida */

  /* durante um deslize programado quem manda e a mira: sem isso, dois
     toques seguidos na seta saem do meio do caminho */
  const daqui = () => (Date.now() < guiando ? mira : Math.max(0, atual));
  const dentro = (k) => Math.max(0, Math.min(paradas.length - 1, k));

  function montar(){
    const fim  = Math.max(0, trilho.scrollWidth - trilho.clientWidth);
    const base = vagas[0].offsetLeft;

    paradas = [];
    lider = [];
    vagas.forEach((v, i) => {
      const onde = Math.min(v.offsetLeft - base, fim);
      if (!paradas.length || onde - paradas[paradas.length - 1] > 8){
        paradas.push(onde);
        lider.push(i);
      }
    });

    pontos.textContent = '';
    bolas = paradas.map((_, k) => {
      const nome = vagas[lider[k]].querySelector('.cartucho-nome');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ponto';
      b.setAttribute('aria-label', 'Ir para ' + (nome ? nome.textContent : 'a posição ' + (k + 1)));
      b.addEventListener('click', () => { irPara(k); focar(lider[k]); });
      pontos.appendChild(b);
      return b;
    });

    /* se tudo couber na tela nao ha o que navegar */
    caixa.dataset.rola = paradas.length > 1 ? '1' : '0';
    atual = -1;   /* forca o proximo medir a pintar a bolinha certa */
  }

  function irPara(k){
    mira = dentro(k);
    guiando = Date.now() + 700;
    trilho.scrollTo({ left: paradas[mira], behavior: parado ? 'auto' : 'smooth' });
  }

  function focar(i){
    const bt = vagas[Math.max(0, Math.min(vagas.length - 1, i))].querySelector('.cartucho');
    /* sem preventScroll o navegador daria o proprio pulo ate o botao,
       atropelando o deslize que acabamos de pedir */
    if (bt) bt.focus({ preventScroll: true });
  }

  /* ---------- o desenho, um por quadro ---------- */

  let pedido = null;

  function medir(){
    pedido = null;

    const r   = trilho.getBoundingClientRect();
    const x   = trilho.scrollLeft;
    const fim = Math.max(0, trilho.scrollWidth - trilho.clientWidth);

    /* le tudo antes de escrever qualquer coisa: intercalar leitura e
       escrita obriga o navegador a refazer o layout a cada cartucho */
    const caixas = vagas.map((v) => v.getBoundingClientRect());

    const meio    = r.left + r.width / 2;
    const alcance = Math.max(1, r.width / 2);

    /* Encostado numa ponta, ninguem daquele lado desbota — senao o
       primeiro cartucho ja nasceria apagado, sem ter para onde ir. */
    const portaEsq = Math.min(1, x / 150);
    const portaDir = Math.min(1, (fim - x) / 150);

    if (!parado){
      caixas.forEach((c, i) => {
        const dx = (c.left + c.width / 2 - meio) / alcance;
        const cru = (Math.abs(dx) - 0.2) / 0.75;
        const f = Math.max(0, Math.min(1, cru)) * (dx < 0 ? portaEsq : portaDir);
        /* --d so precisa dizer de que lado, nao o quanto: solto, um
           cartucho cinco vagas adiante virava 17 graus de tombo e
           crescia 170px de altura, estourando o trilho */
        const lado = Math.max(-1, Math.min(1, dx));
        pecas[i].style.setProperty('--d', lado.toFixed(3));
        pecas[i].style.setProperty('--f', f.toFixed(3));
      });
    }

    let perto = 0;
    let menor = Infinity;
    paradas.forEach((onde, k) => {
      const dist = Math.abs(onde - x);
      if (dist < menor){ menor = dist; perto = k; }
    });

    if (perto !== atual){
      atual = perto;
      bolas.forEach((b, k) => b.setAttribute('aria-current', k === perto ? 'true' : 'false'));
    }

    caixa.dataset.esq = x > 4 ? '1' : '0';
    caixa.dataset.dir = x < fim - 4 ? '1' : '0';
    for (const st of setas){
      st.disabled = Number(st.dataset.anda) < 0 ? x <= 4 : x >= fim - 4;
    }
  }

  const repintar = () => { if (!pedido) pedido = requestAnimationFrame(medir); };

  let sono = null;
  trilho.addEventListener('scroll', () => {
    repintar();
    if (parado) return;
    /* enquanto rola, a vaga obedece o javascript direto; com transicao
       ligada ela ficaria sempre um passo atras do dedo */
    trilho.classList.add('rolando');
    clearTimeout(sono);
    sono = setTimeout(() => trilho.classList.remove('rolando'), 130);
  }, { passive: true });

  /* a largura do cartucho muda com a da tela, e com ela o numero de
     paradas: as bolinhas tem de ser refeitas junto */
  let ajuste = null;
  addEventListener('resize', () => {
    clearTimeout(ajuste);
    ajuste = setTimeout(() => { montar(); repintar(); }, 140);
  }, { passive: true });

  /* ---------- setas e teclado ---------- */

  for (const st of setas){
    st.addEventListener('click', () => irPara(daqui() + Number(st.dataset.anda)));
  }

  trilho.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = dentro(daqui() + (e.key === 'ArrowRight' ? 1 : -1));
    irPara(i);
    focar(i);
  });

  /* ---------- arrastar com o mouse ---------- */

  if (matchMedia('(hover: hover) and (pointer: fine)').matches){
    let base = 0, x0 = 0, puxando = false, andou = false;

    trilho.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      puxando = true;
      andou = false;
      x0 = e.clientX;
      base = trilho.scrollLeft;
    });

    addEventListener('pointermove', (e) => {
      if (!puxando) return;
      const dx = e.clientX - x0;
      /* folga de 5px: um clique tremido continua sendo um clique */
      if (!andou && Math.abs(dx) < 5) return;
      if (!andou){
        andou = true;
        trilho.classList.add('puxando');
        trilho.style.scrollBehavior = 'auto';
        trilho.style.scrollSnapType = 'none';
      }
      trilho.scrollLeft = base - dx;
    });

    const soltar = () => {
      if (!puxando) return;
      puxando = false;
      if (!andou) return;
      trilho.classList.remove('puxando');
      irPara(daqui());
      /* o encaixe so volta depois do deslize; ligado antes, ele daria um
         puxao seco por cima da animacao */
      setTimeout(() => {
        trilho.style.scrollBehavior = '';
        trilho.style.scrollSnapType = '';
      }, 480);
      /* o clique do cartucho chega logo depois do pointerup, entao a
         bandeira so pode cair no fim da fila de eventos */
      setTimeout(() => { andou = false; }, 0);
    };
    addEventListener('pointerup', soltar);
    addEventListener('pointercancel', soltar);

    /* na captura, antes de o cartucho ouvir: arrastar nao abre jogo */
    trilho.addEventListener('click', (e) => {
      if (!andou) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);
  }

  /* ---------- o aceno que conta que da para arrastar ---------- */

  let mexeu = false;
  for (const ev of ['pointerdown', 'wheel', 'keydown', 'touchstart']){
    trilho.addEventListener(ev, () => { mexeu = true; }, { passive: true });
  }

  function acenar(){
    if (parado || mexeu) return;
    if (trilho.scrollWidth <= trilho.clientWidth + 8) return;
    trilho.style.scrollSnapType = 'none';
    trilho.scrollTo({ left: 78, behavior: 'smooth' });
    setTimeout(() => {
      if (!mexeu) trilho.scrollTo({ left: 0, behavior: 'smooth' });
      setTimeout(() => { trilho.style.scrollSnapType = ''; }, 520);
    }, 460);
  }

  if (!parado && 'IntersectionObserver' in window){
    const olho = new IntersectionObserver((entradas) => {
      for (const e of entradas){
        if (!e.isIntersecting) continue;
        olho.disconnect();
        setTimeout(acenar, 700);   /* depois de a secao terminar de entrar */
      }
    }, { threshold: 0.35 });
    olho.observe(caixa);
  }

  montar();
  medir();
})();
