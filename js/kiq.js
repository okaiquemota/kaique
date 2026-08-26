/* ------------------------------------------------------------------
   Endereço da API (o Worker na Cloudflare).

   Vazio = modo local: cada visitante fica com o próprio recorde e o
   próprio mural, no navegador dele. Preencha depois de publicar o
   Worker — ver worker/README.md — e o ranking e o mural viram
   coletivos sem mais nenhuma mudança de código.
   ------------------------------------------------------------------ */
const API = 'https://kiq-api.okaiquemota.workers.dev';

/* A chave de dono chega uma vez pela barra de endereço, em
   ?dono=CHAVE, e fica guardada. ?dono= vazio esquece. É o que faz
   aparecer o botão de tirar recado do mural. */
const Dono = (() => {
  let chave = '';
  try { chave = localStorage.getItem('kiq:dono') || ''; } catch {}
  try {
    const url = new URL(location.href);
    if (url.searchParams.has('dono')) {
      chave = url.searchParams.get('dono') || '';
      try {
        if (chave) localStorage.setItem('kiq:dono', chave);
        else localStorage.removeItem('kiq:dono');
      } catch {}
      url.searchParams.delete('dono');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  } catch {}
  return { chave: () => chave, sou: () => Boolean(chave) };
})();

function apelido(){
  const campo = document.getElementById('apelido');
  const nome = campo ? campo.value.trim().slice(0, 24) : '';
  if (nome) { try { localStorage.setItem('kiq:apelido', nome); } catch {} }
  return nome;
}

/* ------------------------------------------------------------------
   O recorde pessoal vive sempre no navegador — é instantâneo e
   funciona sem rede. O ranking, quando a API existe, é a parte
   coletiva: só é enviado no fim da partida, nunca a cada rodada,
   senão uma sequência boa estoura o limite de escrita do servidor.
   ------------------------------------------------------------------ */
/* Levantada por Placar.guardar quando a pessoa passa o proprio recorde e
   baixada por Placar.enviar, que roda uma vez so, no fim da partida.
   Guardar acontece a cada ponto em alguns jogos — comemorar a cada ponto
   seria um inferno de confete. */
let bateuRecorde = false;

/* Um esguicho curto de confete no painel do jogo aberto. Nasce e morre
   sozinho: nao sobra estado pendurado depois da animacao. */
function festejar(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const painel = document.querySelector('.tela[open] .game');
  if (!painel) return;

  const cores = ['var(--roxo)', 'var(--rosa)', 'var(--amarelo)', 'var(--lilas)'];
  const festa = document.createElement('div');
  festa.className = 'festa';
  festa.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < 34; i++){
    /* leque para cima: entre -172 e -8 graus, distancia variavel */
    const angulo = (-172 + Math.random() * 164) * Math.PI / 180;
    const longe  = 110 + Math.random() * 190;
    const grao = document.createElement('i');
    grao.style.setProperty('--x', Math.round(Math.cos(angulo) * longe) + 'px');
    grao.style.setProperty('--y', Math.round(Math.sin(angulo) * longe) + 'px');
    grao.style.setProperty('--c', cores[i % cores.length]);
    grao.style.setProperty('--d', (Math.random() * 0.16).toFixed(2) + 's');
    /* tamanho e giro variados: papel picado de verdade nao e quadrado */
    grao.style.setProperty('--h', (6 + Math.round(Math.random() * 9)) + 'px');
    grao.style.setProperty('--giro', Math.round(-260 + Math.random() * 520) + 'deg');
    festa.appendChild(grao);
  }

  painel.appendChild(festa);
  setTimeout(() => festa.remove(), 1600);
}

const Placar = {
  melhor(jogo){
    try { return Number(localStorage.getItem('kiq:recorde:' + jogo)) || 0; }
    catch { return 0; }
  },
  guardar(jogo, pontos){
    try {
      const antes = Placar.melhor(jogo);
      if (pontos <= antes) return;
      /* a primeira partida da vida bate o "recorde" por definicao: nao vale festa */
      if (antes > 0) bateuRecorde = true;
      localStorage.setItem('kiq:recorde:' + jogo, String(pontos));
    } catch {}
  },

  async topo(jogo){
    if (!API) return null;
    try {
      const r = await fetch(API + '/placar?jogo=' + encodeURIComponent(jogo));
      if (!r.ok) return null;
      const c = await r.json();
      return Array.isArray(c.topo) ? c.topo : null;
    } catch { return null; }
  },

  async enviar(jogo, pontos){
    /* antes de qualquer rede: a festa nao depende de servidor nenhum */
    if (bateuRecorde){ bateuRecorde = false; festejar(); }
    if (!API || !Number.isInteger(pontos) || pontos < 1) return null;
    try {
      const r = await fetch(API + '/placar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jogo: jogo, nome: apelido(), pontos: pontos })
      });
      if (!r.ok) return null;
      const c = await r.json();
      return Array.isArray(c.topo) ? c.topo : null;
    } catch { return null; }
  }
};

/* Desenha o quadro de um jogo. Sem API, o bloco fica escondido. */
async function ranking(jogo, lista){
  const caixa = document.getElementById(jogo + '-rank');
  const alvo  = document.getElementById(jogo + '-lista');
  if (!caixa || !alvo) return;
  if (!API){ caixa.hidden = true; return; }

  const topo = lista || await Placar.topo(jogo);
  if (!topo){ caixa.hidden = true; return; }

  caixa.hidden = false;
  alvo.textContent = '';

  if (!topo.length){
    const vazio = document.createElement('li');
    vazio.className = 'sem-rank';
    vazio.textContent = 'ninguém jogou ainda';
    alvo.append(vazio);
    return;
  }

  const eu = (() => { try { return localStorage.getItem('kiq:apelido') || ''; } catch { return ''; } })();
  topo.forEach((linha, i) => {
    const item = document.createElement('li');
    if (eu && linha.nome === eu) item.dataset.eu = 'sim';
    const pos = document.createElement('b');
    pos.textContent = String(i + 1);
    const quem = document.createElement('span');
    quem.textContent = linha.nome;          // textContent: nome vem de fora
    const pts = document.createElement('i');
    pts.textContent = String(linha.pontos);
    item.append(pos, quem, pts);
    alvo.append(item);
  });
}

const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------- movimento da pagina ------------------------- */
(() => {
  'use strict';

  /* Marca que o script esta vivo. O CSS so esconde o que vai ser
     revelado se esta classe existir — assim, com javascript
     desligado, nada some. */
  document.documentElement.classList.add('com-js');

  const parado = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- entrada conforme a pagina rola ---------- */

  const revelar = [
    ...document.querySelectorAll('.play-top'),
    ...document.querySelectorAll('.carrossel'),
    ...document.querySelectorAll('.compor')
  ];
  for (const el of revelar) el.classList.add('revela');

  /* ---------- o recorde do cartucho sobe contando ---------- */

  /* Anda do numero que esta na tela ate o alvo. Se o alvo for menor ou
     igual ao que ja esta escrito, deixa quieto: o valor na tela e o mais
     fresco (foi o fim de uma partida que escreveu ali). */
  function contarAte(el, alvo){
    const de = Number(el.textContent) || 0;
    if (alvo <= de) return;
    const dura  = Math.min(1000, 300 + alvo * 24);
    const berco = performance.now();

    requestAnimationFrame(function passo(agora){
      const t = Math.min(1, (agora - berco) / dura);
      const suave = 1 - Math.pow(1 - t, 3);   /* desacelera: o numero assenta */
      el.textContent = String(Math.round(de + (alvo - de) * suave));
      if (t < 1) requestAnimationFrame(passo);
    });
  }

  /* Guarda o recorde de lado e zera o que aparece, para o numero ter de
     onde subir quando o cartucho entrar na tela. */
  /* O recorde nasce em 0 no html e quem escreve e o javascript: quem
     guarda o numero e o navegador de quem jogou, nao a pagina. Ler do
     Placar em vez de ler o que ja esta na tela tira a dependencia de
     qual arquivo rodou primeiro. */
  const marcadores = new Set(document.querySelectorAll('[data-rec]'));
  const contadores = new Map();

  if (!parado && 'IntersectionObserver' in window) {
    for (const dono of revelar) {
      const fila = [];
      for (const el of dono.querySelectorAll('[data-rec]')) {
        marcadores.delete(el);
        const alvo = Placar.melhor(el.dataset.rec);
        el.textContent = '0';
        if (alvo > 0) fila.push({ el, alvo });
      }
      if (fila.length) contadores.set(dono, fila);
    }
  }

  /* quem nao esta dentro de nada que entra rolando recebe o numero
     na hora, sem contagem */
  for (const el of marcadores) el.textContent = String(Placar.melhor(el.dataset.rec));

  if (parado || !('IntersectionObserver' in window)) {
    for (const el of revelar) el.classList.add('aqui');
  } else {
    const olho = new IntersectionObserver((entradas) => {
      /* escalona pela ordem em que entram, nao pela ordem no documento:
         quem chega junto sobe em cascata, quem chega sozinho sobe na hora */
      let i = 0;
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        e.target.style.setProperty('--atraso', (i * 0.07).toFixed(2) + 's');
        e.target.classList.add('aqui');
        olho.unobserve(e.target);   /* uma vez so: reanimar ao rolar de volta enjoa */

        /* o carrossel entra primeiro, os numeros contam depois, um
           atras do outro */
        const fila = contadores.get(e.target);
        if (fila) {
          contadores.delete(e.target);
          fila.forEach((c, k) => setTimeout(() => contarAte(c.el, c.alvo), 320 + k * 95));
        }
        i += 1;
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

    for (const el of revelar) olho.observe(el);
  }

  /* A inclinacao no cursor e a seta magnetica moravam aqui. Sairam com
     os cards: a capa virou uma mesa, e la o objeto levanta por CSS —
     sobe, endireita e cresce — sem javascript no meio. */

})();

/* --------------------- arranque do que depende da API --------------------- */
(() => {
  'use strict';
  const campo = document.getElementById('apelido');
  const caixa = document.getElementById('apelido-campo');
  if (campo && caixa && API){
    caixa.hidden = false;
    try { campo.value = localStorage.getItem('kiq:apelido') || ''; } catch {}
    campo.addEventListener('change', () => { apelido(); });
  }
  /* O quadro de cada jogo mora dentro de uma tela fechada, e quem abre
     a tela ja busca o dele. Carregar os seis aqui era seis chamadas por
     visita para nada — e uma lista de nomes de jogo repetida num
     arquivo que nao deveria conhecer jogo nenhum, que foi exatamente o
     que fez os rankings sumirem da outra vez. */
})();
