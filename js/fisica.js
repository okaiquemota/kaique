/* ============================================================
   KAIQUE MOTA — física dos cards em gravidade zero
   ------------------------------------------------------------
   JavaScript puro, sem biblioteca. Faz três coisas:

   1. DERIVA   — cada card vagueia sozinho pela página, com uma
                 corrente aleatória fraca empurrando de leve, como
                 tralha boiando na água.
   2. COLISÃO  — cards batem entre si e nas bordas da tela.
   3. ARRASTO  — segurar e mover um card o leva junto; ao soltar,
                 ele sai com a velocidade do arremesso e continua
                 planando até a corrente e o atrito o acalmarem.

   Convivência com os [data-abre]: um clique/toque SEM arrasto
   passa direto e dispara o listener normalmente. Só o clique que
   nasce de um arrasto é cancelado — senão soltar um card em cima
   de outro lugar abriria o modal sem querer.

   Divisão de transforms (importante):
     .orbe         → posição, escrita por este arquivo
     .orbe__flutua → o balanço em @keyframes, do CSS
     .orbe__face   → a escala do hover, do CSS
   Cada um tem seu dono e nenhum sobrescreve o outro.
   ============================================================ */

(function () {
  'use strict';

  var orbes = Array.prototype.slice.call(document.querySelectorAll('.orbe'));
  if (!orbes.length || !window.requestAnimationFrame) return;

  /* "Reduzir movimento" existe para poupar quem se incomoda com
     animação que roda sozinha. Ela NÃO deve matar a resposta ao gesto
     do próprio usuário: arrastar e arremessar seguem idênticos nos
     dois casos. O que essa preferência faz aqui é deixar a deriva
     ambiente mais lenta — e o CSS já desliga o balanço decorativo. */
  var calmo = window.matchMedia &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var brisa = calmo ? 0.4 : 1;

  /* --- constantes do "líquido" ------------------------------ */
  var MARGEM        = 8;      // respiro até a borda da tela (px)
  var ATRITO        = 0.9993; // por quadro a 60fps: quase nada
  var RESTITUICAO   = 0.82;   // energia devolvida na batida
  var VEL_INICIAL   = 30 * brisa;   // px/s
  var CORRENTE      = 26 * brisa;   // empurrão aleatório, px/s²
  var VEL_MAX       = 900;    // teto do arremesso, px/s
  var VEL_DERIVA    = 105;    // teto da deriva livre, px/s
var VEL_MIN       = 20 * brisa;   // piso: em gravidade zero nada para
  var LIMIAR_ARRASTO = 5;     // px percorridos que já contam como arrasto

  /* --- estado de cada card ---------------------------------- */
  var corpos = orbes.map(function (el) {
    return {
      el: el, x: 0, y: 0, vx: 0, vy: 0,
      base: { x: 0, y: 0 }, w: 0, h: 0,
      arrastando: false, ponteiro: null,
      px: 0, py: 0, tUltimo: 0, percorrido: 0,
      origemX: null, origemY: null, destino: null
    };
  });

  function aplicar(c) {
    c.el.style.transform = 'translate3d(' + c.x.toFixed(2) + 'px,' + c.y.toFixed(2) + 'px,0)';
  }

  /* Mede onde o CSS colocou cada card e zera os deslocamentos.
     A posição do CSS (os top/left em %) segue sendo a verdade do
     layout; a física só trabalha em cima dela. */
  function medir() {
    corpos.forEach(function (c) {
      c.el.style.transform = 'none';
      var r = c.el.getBoundingClientRect();
      c.base.x = r.left;
      c.base.y = r.top;
      c.w = r.width;
      c.h = r.height;
      c.x = 0;
      c.y = 0;
      aplicar(c);
    });
  }

  /* limites de deslocamento de um card, em px */
  function limites(c) {
    var min = { x: MARGEM - c.base.x, y: MARGEM - c.base.y };
    var max = {
      x: window.innerWidth  - MARGEM - c.w - c.base.x,
      y: window.innerHeight - MARGEM - c.h - c.base.y
    };
    if (max.x < min.x) max.x = min.x = (min.x + max.x) / 2;
    if (max.y < min.y) max.y = min.y = (min.y + max.y) / 2;
    return { min: min, max: max };
  }

  function bater(c) {
    var l = limites(c);
    if (c.x < l.min.x) { c.x = l.min.x; c.vx = Math.abs(c.vx) * RESTITUICAO; }
    else if (c.x > l.max.x) { c.x = l.max.x; c.vx = -Math.abs(c.vx) * RESTITUICAO; }
    if (c.y < l.min.y) { c.y = l.min.y; c.vy = Math.abs(c.vy) * RESTITUICAO; }
    else if (c.y > l.max.y) { c.y = l.max.y; c.vy = -Math.abs(c.vy) * RESTITUICAO; }
  }

  /* --- colisão entre dois cards ----------------------------- */
  function colidir(a, b) {
    var ax = a.base.x + a.x, ay = a.base.y + a.y;
    var bx = b.base.x + b.x, by = b.base.y + b.y;

    var invadeX = Math.min(ax + a.w, bx + b.w) - Math.max(ax, bx);
    var invadeY = Math.min(ay + a.h, by + b.h) - Math.max(ay, by);
    if (invadeX <= 0 || invadeY <= 0) return;

    // quem está na mão não é empurrado: o outro cede a passagem inteira
    var pesoA = a.arrastando ? 0 : (b.arrastando ? 1 : 0.5);
    var pesoB = b.arrastando ? 0 : (a.arrastando ? 1 : 0.5);

    if (invadeX < invadeY) {                       // separa no eixo X
      var sinalX = (ax + a.w / 2) < (bx + b.w / 2) ? -1 : 1;
      a.x += invadeX * sinalX * pesoA;
      b.x -= invadeX * sinalX * pesoB;
      if (!a.arrastando && !b.arrastando) {
        var tx = a.vx; a.vx = b.vx * RESTITUICAO; b.vx = tx * RESTITUICAO;
      }
    } else {                                       // separa no eixo Y
      var sinalY = (ay + a.h / 2) < (by + b.h / 2) ? -1 : 1;
      a.y += invadeY * sinalY * pesoA;
      b.y -= invadeY * sinalY * pesoB;
      if (!a.arrastando && !b.arrastando) {
        var ty = a.vy; a.vy = b.vy * RESTITUICAO; b.vy = ty * RESTITUICAO;
      }
    }
  }

  /* --- o href sai do caminho ---------------------------------
     Um <a href> é interceptável por qualquer listener de clique em
     fase de captura no window — e captura desce do window para o
     elemento, então esse listener roda ANTES do nosso, sempre.
     O visualizador de artifacts do Claude faz exatamente isso:
     procura o closest('a[href]') e manda o shell navegar. Não há
     ordem de registro que ganhe dele, e o preventDefault chega
     tarde: a navegação já foi disparada.

     Solução: guardamos o destino e tiramos o href do elemento. Sem
     href, não existe o que interceptar — nem para o visualizador,
     nem para o navegador. O href volta por um instante só quando a
     ativação é de verdade (ver ativar()).

     Sem JS a página degrada bem: os href continuam no HTML e os
     links funcionam como links comuns.
     ------------------------------------------------------------ */
  corpos.forEach(function (c) {
    var el = c.el;
    if (el.tagName !== 'A') return;
    var destino = el.getAttribute('href');
    if (!destino) return;

    c.destino = destino;
    el.removeAttribute('href');
    el.setAttribute('role', 'link');           // continua sendo link para leitores de tela
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  });

  /* Ativação de verdade: devolve o href, dispara um click e tira o
     href de novo. O dispatch é síncrono, então quando o click()
     retorna quem tinha de ler o href já leu. */
  function ativar(c) {
    var el = c.el;
    if (c.destino) {
      el.setAttribute('href', c.destino);
      el.click();
      el.removeAttribute('href');
    } else {
      el.click();                              // [data-abre]: o modal escuta o click
    }
  }

  /* --- seleção ---------------------------------------------- */
  function selecionar(alvo) {
    corpos.forEach(function (o) {
      o.el.classList.toggle('esta-selecionado', o === alvo);
    });
  }

  // clicar no vácuo tira a seleção
  document.addEventListener('pointerdown', function (e) {
    if (!e.target || !e.target.closest || !e.target.closest('.orbe')) selecionar(null);
  });

  /* --- arrasto ----------------------------------------------
     Duas lições que custaram caro:

     1. Não dá para confiar que o pointermove chega. Se o navegador
        resolve iniciar o arraste nativo de link, ou se alguma camada
        acima (o iframe de um visualizador, por exemplo) captura o
        ponteiro, o fluxo simplesmente para no meio. Por isso o
        rastreamento escuta na JANELA e não no card, e o veredito
        sobre o clique sai das COORDENADAS DO PRÓPRIO CLIQUE: se o
        ponteiro subiu longe de onde desceu, foi arrasto — não
        importa quantos pointermove chegaram.

     2. O arraste nativo tem de ser barrado antes de nascer, e ele
        nasce do mousedown. Daí o preventDefault nos dois eventos.
     ------------------------------------------------------------ */
  corpos.forEach(function (c) {
    var el = c.el;

    function aoMover(e) {
      if (!c.arrastando || e.pointerId !== c.ponteiro) return;

      var dx = e.clientX - c.px;
      var dy = e.clientY - c.py;
      var dt = Math.max(1, e.timeStamp - c.tUltimo) / 1000;

      c.px = e.clientX;
      c.py = e.clientY;
      c.tUltimo = e.timeStamp;
      c.percorrido += Math.abs(dx) + Math.abs(dy);

      c.x += dx;
      c.y += dy;

      // velocidade do arremesso, suavizada: um tremor no fim do gesto
      // não pode sozinho jogar o card para o outro lado da tela
      c.vx = 0.75 * (dx / dt) + 0.25 * c.vx;
      c.vy = 0.75 * (dy / dt) + 0.25 * c.vy;

      bater(c);
      aplicar(c);
    }

    function aoSoltar(e) {
      if (!c.arrastando || (e && e.pointerId !== c.ponteiro)) return;
      c.arrastando = false;
      c.ponteiro = null;
      el.classList.remove('a-arrastar');
      escutarJanela(false);

      var v = Math.hypot(c.vx, c.vy);
      if (v > VEL_MAX) { c.vx *= VEL_MAX / v; c.vy *= VEL_MAX / v; }
    }

    function escutarJanela(ligar) {
      var m = ligar ? 'addEventListener' : 'removeEventListener';
      window[m]('pointermove', aoMover);
      window[m]('pointerup', aoSoltar);
      window[m]('pointercancel', aoSoltar);
    }

    el.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;                    // só botão principal
      e.preventDefault();

      c.arrastando = true;
      c.ponteiro = e.pointerId;
      c.percorrido = 0;
      c.origemX = e.clientX;                       // o que decide o clique
      c.origemY = e.clientY;
      c.px = e.clientX;
      c.py = e.clientY;
      c.tUltimo = e.timeStamp;
      c.vx = c.vy = 0;
      el.classList.add('a-arrastar');
      selecionar(c);

      try { el.setPointerCapture(e.pointerId); } catch (erro) { /* opcional */ }
      escutarJanela(true);
    });

    // segunda barreira contra o arraste nativo (é do mousedown que ele
    // nasce). Também impede o foco de mouse — que é justamente o que
    // acendia o contorno do :focus-visible ao clicar.
    el.addEventListener('mousedown', function (e) { e.preventDefault(); });

    el.addEventListener('dragstart', function (e) { e.preventDefault(); });

    /* Um clique só seleciona. Quem abre é o clique duplo.
       Em fase de captura, para rodar antes de qualquer listener de
       modal — inclusive um delegado no document. */
    el.addEventListener('click', function (e) {
      if (e.detail === 0) return;      // click() programático ou teclado: vale
      e.preventDefault();
      e.stopPropagation();
    }, true);

    /* Dois cliques rápidos ativam de verdade. O el.click() nasce com
       detail 0, então atravessa o filtro acima sozinho: o <a> navega e
       os listeners de [data-abre] recebem um click normal, sem que o
       contrato deles precise saber que existe um duplo clique aqui. */
    el.addEventListener('dblclick', function (e) {
      e.preventDefault();
      e.stopPropagation();

      // se o gesto foi arrasto, não é ativação
      if (c.origemX !== null) {
        var longe = Math.hypot(e.clientX - c.origemX, e.clientY - c.origemY);
        if (c.percorrido > LIMIAR_ARRASTO || longe > LIMIAR_ARRASTO) return;
      }

      selecionar(c);
      ativar(c);
    });

    /* sem href, o <a> perde a ativação nativa por teclado — repomos */
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      if (!c.destino) return;                  // <button> já faz isso sozinho
      e.preventDefault();
      selecionar(c);
      ativar(c);
    });
  });

  /* --- laço ------------------------------------------------- */
  var anterior = 0;

  function passo(agora) {
    var dt = anterior ? Math.min(0.05, (agora - anterior) / 1000) : 0;
    anterior = agora;

    var atrito = Math.pow(ATRITO, dt * 60);

    corpos.forEach(function (c) {
      if (c.arrastando) return;

      // corrente do "líquido": um empurrãozinho aleatório constante
      if (CORRENTE) {
        c.vx += (Math.random() - 0.5) * CORRENTE * dt * 2;
        c.vy += (Math.random() - 0.5) * CORRENTE * dt * 2;
      }

      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vx *= atrito;
      c.vy *= atrito;

      var v = Math.hypot(c.vx, c.vy);

      // teto só para a deriva — um arremesso pode passar disso e
      // vai desacelerando sozinho até voltar para a faixa calma
      if (v > VEL_DERIVA) {
        var alvo = Math.max(VEL_DERIVA, v * atrito);
        c.vx *= alvo / v;
        c.vy *= alvo / v;
      }

      /* Piso de velocidade. Sem ele a caminhada aleatória da corrente
         eventualmente cancela a si mesma e o objeto fica parado no
         vácuo — que é justamente o que não deve acontecer aqui. */
      else if (v < VEL_MIN) {
        if (v < 0.01) {                        // parou de vez: escolhe um rumo
          var ang = Math.random() * Math.PI * 2;
          c.vx = Math.cos(ang);
          c.vy = Math.sin(ang);
          v = 1;
        }
        c.vx *= VEL_MIN / v;
        c.vy *= VEL_MIN / v;
      }

      bater(c);
    });

    for (var i = 0; i < corpos.length; i++) {
      for (var j = i + 1; j < corpos.length; j++) colidir(corpos[i], corpos[j]);
    }

    corpos.forEach(function (c) {
      if (!c.arrastando) { bater(c); aplicar(c); }
    });

    requestAnimationFrame(passo);
  }

  /* --- partida ---------------------------------------------- */
  function iniciar() {
    medir();
    corpos.forEach(function (c) {
      var a = Math.random() * Math.PI * 2;
      c.vx = Math.cos(a) * VEL_INICIAL;
      c.vy = Math.sin(a) * VEL_INICIAL;
    });
  }

  iniciar();

  // as fontes chegam depois e podem mudar a largura dos cards
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(medir);
  }

  var espera;
  window.addEventListener('resize', function () {
    clearTimeout(espera);
    espera = setTimeout(medir, 150);
  });

  requestAnimationFrame(passo);
})();
