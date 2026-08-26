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
  var LIMIAR_ARRASTO = 5;     // mouse: px percorridos que já contam como arrasto

  /* O dedo não pousa parado. Um toque que a pessoa jura ter sido
     imóvel anda uns 10px enquanto a polpa se acomoda, e medido com a
     régua do mouse ele vira arrasto — que é justamente o gesto que
     nunca ativa nada. Era metade do motivo de nenhum link abrir no
     celular. */
  var LIMIAR_DEDO = 14;

  /* Os dois toques da ativação, medidos só no tempo.

     Não há trava de distância entre um e outro, e isso é decisão e
     não esquecimento: o objeto DERIVA. Com VEL_DERIVA em 105px/s,
     meio segundo já leva a peça quase 50px para o lado, e quem
     acompanha com o dedo toca em dois pontos diferentes da tela
     por culpa do movimento, não por engano. Qualquer raio que
     coubesse num toque parado recusaria o toque legítimo num
     objeto rápido.

     Quem faz esse papel é outra coisa, e melhor: os dois toques
     precisam cair no MESMO objeto — cada corpo guarda o próprio
     último toque — e nenhum dos dois pode ter sido arrasto. */
  var JANELA_2TOQUES = 450;   // ms

  function folga(e) {
    return e && e.pointerType === 'touch' ? LIMIAR_DEDO : LIMIAR_ARRASTO;
  }

  /* --- e se a gravidade voltasse? -----------------------------
     O chão devolve pouco (QUICA_CHAO) e arrasta na horizontal
     (ATRITO_CHAO): é essa perda que faz a pilha se formar em vez
     de tudo quicar para sempre. Abaixo de PARA_DE_QUICAR o objeto
     desiste e descansa — sem esse corte ele treme no chão eterno,
     quicando um pixel de cada vez. */
  var GRAVIDADE      = 3600;  // px/s² — bem acima dos 9,8m/s² reais:
                              //   a tela tem meio metro de queda, e no
                              //   valor real a coisa parece pena caindo
  var QUICA_CHAO     = 0.34;
  var ATRITO_CHAO    = 0.72;
  var PARA_DE_QUICAR = 46;    // px/s
  var caindo = false;

  /* --- os painéis ------------------------------------------------
     Passatempo e Mural são telas sobre a capa, não outra aba: o espaço
     continua atrás, e fechar devolve a pessoa exatamente onde estava.
     O conteúdo é o mesmo das páginas com endereço próprio — quem monta
     é o build, para as duas versões nunca desencontrarem.
     ------------------------------------------------------------ */
  var painelAberto = null;
  var quemAbriu = null;

  function abrirPainel(nome, origem) {
    var painel = document.getElementById('painel-' + nome);
    if (!painel) return false;

    fecharPainel();
    painelAberto = painel;
    quemAbriu = origem || null;
    painel.classList.add('aberto');
    document.documentElement.classList.add('com-painel');

    /* O carrossel se mede na carga, e ali o painel ainda não tinha
       tamanho na tela. Um resize avisa o jogos.js para medir de novo
       agora que há largura de verdade. */
    try { window.dispatchEvent(new Event('resize')); } catch (erro) {}

    var foco = painel.querySelector('[data-fecha-painel]');
    if (foco) foco.focus({ preventScroll: true });
    return true;
  }

  function fecharPainel() {
    if (!painelAberto) return;

    // uma partida não fica rodando escondida atrás da capa
    var jogo = painelAberto.querySelector('.tela[open]');
    if (jogo) { try { jogo.close(); } catch (erro) {} }

    painelAberto.classList.remove('aberto');
    document.documentElement.classList.remove('com-painel');
    painelAberto = null;

    if (quemAbriu) { try { quemAbriu.focus({ preventScroll: true }); } catch (erro) {} }
    quemAbriu = null;
  }

  document.addEventListener('click', function (e) {
    if (!painelAberto) return;
    // o X, ou o vácuo em volta da folha
    if (e.target.closest && e.target.closest('[data-fecha-painel]')) { fecharPainel(); return; }
    if (e.target === painelAberto) fecharPainel();
  });

  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !painelAberto) return;
    // Esc dentro de um jogo fecha o jogo; o painel só depois
    if (painelAberto.querySelector('.tela[open]')) return;
    fecharPainel();
  });

  /* No celular a gravidade não precisa apontar para baixo: aponta para
     onde o aparelho estiver inclinado. beta é o tombo para frente/trás,
     gamma o tombo para os lados — o seno de cada um dá direto a
     componente da gravidade naquele eixo, e deitar o telefone na mesa
     zera os dois: as coisas voltam a boiar. */
  var inclinacao = null;
  var ouvindoTombo = false;

  /* Com giroscópio o peso deixa de ser liga/desliga e vira um valor:
     deitar o telefone na mesa dá zero, e zero tem de significar
     ausência de peso de verdade — parede que não segura, corrente de
     volta, piso de velocidade de volta. É comPeso, e não "caindo",
     que responde por isso no resto do laço. */
  var comPeso = false;

  /* --- o vácuo sente o cursor --------------------------------
     Os objetos se afastam do ponteiro antes de serem tocados. A
     força é medida da BORDA da peça, não do centro: assim ela cai
     a zero quando o cursor entra em cima do objeto, e dá para
     mirar e clicar nele. Se fosse do centro, o item fugiria
     justamente na hora de acertá-lo. */
  var RAIO_CURSOR = 175;            // px de alcance
  var VEL_FUGA    = 190 * brisa;    // px/s: o quanto ele foge, no máximo
  var ACEL_FUGA   = 1000 * brisa;   // px/s²: o quão rápido chega lá
  var cursor = { x: null, y: null };

  /* --- estado de cada card ---------------------------------- */
  var corpos = orbes.map(function (el) {
    return {
      el: el, x: 0, y: 0, vx: 0, vy: 0,
      base: { x: 0, y: 0 }, w: 0, h: 0,
      arrastando: false, ponteiro: null,
      px: 0, py: 0, tUltimo: 0, percorrido: 0,
      origemX: null, origemY: null, destino: null,
      /* quando foi o toque anterior NESTE objeto: é com ele que o
         próximo decide se virou ativação */
      tToque: 0
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

  /* Com o telefone inclinado a "queda" pode ser para qualquer lado, e
     a pilha se forma contra a parede que estiver por baixo. Então as
     quatro bordas absorvem igual: devolvem pouco na perpendicular,
     arrastam na paralela, e abaixo de um limiar o objeto assenta. No
     vácuo (caindo falso) nada disso vale e a batida é elástica. */
  function bater(c) {
    var l = limites(c);
    var quica = comPeso ? QUICA_CHAO : RESTITUICAO;

    function assentar(eixo) {
      if (!comPeso) return;
      var outro = eixo === 'x' ? 'y' : 'x';
      c['v' + outro] *= ATRITO_CHAO;
      if (Math.abs(c['v' + eixo]) < PARA_DE_QUICAR) c['v' + eixo] = 0;
    }

    if (c.x < l.min.x)      { c.x = l.min.x; c.vx =  Math.abs(c.vx) * quica; assentar('x'); }
    else if (c.x > l.max.x) { c.x = l.max.x; c.vx = -Math.abs(c.vx) * quica; assentar('x'); }

    if (c.y < l.min.y)      { c.y = l.min.y; c.vy =  Math.abs(c.vy) * quica; assentar('y'); }
    else if (c.y > l.max.y) { c.y = l.max.y; c.vy = -Math.abs(c.vy) * quica; assentar('y'); }
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
        if (comPeso) {
          // pousou em cima do outro: a queda morre aqui, senão a pilha
          // fica quicando e nunca assenta
          a.vy *= 0.24; b.vy *= 0.24;
          a.vx *= 0.86; b.vx *= 0.86;
        } else {
          var ty = a.vy; a.vy = b.vy * RESTITUICAO; b.vy = ty * RESTITUICAO;
        }
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

    if (el.dataset.abre) {
      /* Primeiro o click, para um eventual script de modal ter a
         primeira palavra: se ele chamar preventDefault, quem manda é
         ele e o painel não abre. */
      var aviso = new MouseEvent('click', { bubbles: true, cancelable: true });
      if (!el.dispatchEvent(aviso)) return;
      if (abrirPainel(el.dataset.abre, el)) return;
    }

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
    /* quem lê isto é a dica do segundo toque, que só existe no
       toque — no desktop o title de cada objeto já conta */
    document.documentElement.classList.toggle('tem-selecao', Boolean(alvo));
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

      /* --- o segundo toque -------------------------------------
         O dblclick nasceu para o mouse. No toque o navegador até
         tenta sintetizá-lo, mas com `touch-action: none` e o
         preventDefault do pointerdown a maioria dos celulares não
         entrega nenhum — e sem dblclick não existia segundo evento
         para ativar: o primeiro toque selecionava e acabava ali.

         O arrasto já era nosso; o segundo toque passa a ser também.
         Dois pointerup limpos no mesmo objeto, perto um do outro no
         tempo e na tela, valem ativação — e isso vale igual para
         dedo, caneta e mouse, que é o que tira o dblclick do
         caminho crítico de vez.
         --------------------------------------------------------- */
      if (!e || e.type !== 'pointerup') return;

      /* mesmo veredito do clique: conta a distância entre onde o
         ponteiro desceu e onde subiu, não quantos pointermove
         chegaram no meio */
      var limite = folga(e);
      var longe = c.origemX === null ? 0
        : Math.hypot(e.clientX - c.origemX, e.clientY - c.origemY);

      if (c.percorrido > limite || longe > limite) { c.tToque = 0; return; }

      if (c.tToque && e.timeStamp - c.tToque < JANELA_2TOQUES) {
        c.tToque = 0;
        selecionar(c);
        ativar(c);
        return;
      }

      c.tToque = e.timeStamp;
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

    /* O dblclick não ativa mais nada — quem ativa é o pointerup, em
       `aoSoltar`. Ele fica só para barrar o que o navegador faria
       sozinho com dois cliques: selecionar o texto em volta. Se ele
       também ativasse, o mouse abriria duas vezes, porque os dois
       pointerup do duplo clique já disparam a ativação. */
    el.addEventListener('dblclick', function (e) {
      e.preventDefault();
      e.stopPropagation();
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

    /* Quanto do peso está valendo agora. Sem giroscópio é tudo ou
       nada; com ele, é o tamanho do vetor de inclinação — telefone
       deitado dá quase zero e a página volta a ser vácuo sozinha. */
    comPeso = caindo && (!inclinacao || Math.hypot(inclinacao.x, inclinacao.y) > 0.09);

    corpos.forEach(function (c) {
      if (c.arrastando) return;

      if (comPeso) {
        if (inclinacao) {
          c.vx += GRAVIDADE * inclinacao.x * dt;
          c.vy += GRAVIDADE * inclinacao.y * dt;
        } else {
          c.vy += GRAVIDADE * dt;
        }
      } else if (CORRENTE) {
        // corrente do "líquido": um empurrãozinho aleatório constante
        c.vx += (Math.random() - 0.5) * CORRENTE * dt * 2;
        c.vy += (Math.random() - 0.5) * CORRENTE * dt * 2;
      }

      empurrarDoCursor(c, dt);

      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vx *= atrito;
      if (!comPeso) c.vy *= atrito;

      var v = Math.hypot(c.vx, c.vy);

      // teto só para a deriva — um arremesso pode passar disso e
      // vai desacelerando sozinho até voltar para a faixa calma.
      // Sob peso ele sai de cena: frear uma queda é justamente o que
      // fazia a coisa parecer lenta.
      if (comPeso) { /* em queda livre não há teto */ }
      else if (v > VEL_DERIVA) {
        var alvo = Math.max(VEL_DERIVA, v * atrito);
        c.vx *= alvo / v;
        c.vy *= alvo / v;
      }

      /* Piso de velocidade. Sem ele a caminhada aleatória da corrente
         eventualmente cancela a si mesma e o objeto fica parado no
         vácuo — que é justamente o que não deve acontecer aqui.
         Com gravidade ligada o piso sai de cena: lá parar é o certo. */
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

    // o balanço em @keyframes só fica desligado enquanto há peso mesmo
    if (caindo) document.documentElement.classList.toggle('com-peso', comPeso);

    requestAnimationFrame(passo);
  }

  /* --- o cursor ---------------------------------------------- */
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;   // no toque o dedo já arrasta
    cursor.x = e.clientX;
    cursor.y = e.clientY;
  }, { passive: true });

  // ponteiro fora da janela não empurra nada
  document.addEventListener('mouseleave', function () { cursor.x = cursor.y = null; });
  window.addEventListener('blur', function () { cursor.x = cursor.y = null; });

  function empurrarDoCursor(c, dt) {
    if (cursor.x === null || !VEL_FUGA) return;

    /* Onde há peso o cursor não sopra nada: com gravidade a pilha tem
       de ficar onde caiu, e um objeto fugindo do ponteiro desmancharia
       o empilhamento que a queda acabou de formar. */
    if (comPeso) return;

    var x0 = c.base.x + c.x, y0 = c.base.y + c.y;
    var x1 = x0 + c.w,       y1 = y0 + c.h;

    // ponto da caixa mais perto do cursor — dentro dela, dá o próprio
    // cursor, e a distância zera junto com a força
    var px = Math.max(x0, Math.min(cursor.x, x1));
    var py = Math.max(y0, Math.min(cursor.y, y1));
    var dx = px - cursor.x, dy = py - cursor.y;
    var d = Math.hypot(dx, dy);
    if (d < 0.01 || d > RAIO_CURSOR) return;

    var ux = dx / d, uy = dy / d;                   // direção de fuga

    /* Empurrar com aceleração livre lança o objeto para o outro lado
       da tela: no vácuo ele guarda tudo que recebeu. Então o cursor
       não acelera — ele estabelece uma VELOCIDADE DE FUGA, e só
       acrescenta o que falta para chegar nela. Quem já está fugindo
       rápido o bastante não recebe nada, e o efeito nunca vira sopro. */
    var alvo = VEL_FUGA * (1 - d / RAIO_CURSOR);
    var indo = c.vx * ux + c.vy * uy;               // velocidade já na direção
    if (indo >= alvo) return;

    var falta = Math.min(alvo - indo, ACEL_FUGA * dt);
    c.vx += ux * falta;
    c.vy += uy * falta;
  }

  /* --- giroscópio -------------------------------------------- */
  function lerTombo(e) {
    if (e.beta === null || e.gamma === null) return;
    var x = Math.sin(e.gamma * Math.PI / 180);
    var y = Math.sin(e.beta  * Math.PI / 180);
    var m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }               // nunca mais forte que 1g
    inclinacao = { x: x, y: y };
  }

  function ouvirTombo() {
    if (ouvindoTombo || !window.DeviceOrientationEvent) return;

    /* O iOS 13+ só entrega leitura depois de um pedido explícito, e o
       pedido só vale dentro de um gesto do usuário. É por isso que ele
       mora no clique da chave e não na carga da página — ali seria
       recusado em silêncio. Nos outros basta escutar (com HTTPS). */
    var pedir = window.DeviceOrientationEvent.requestPermission;
    if (typeof pedir === 'function') {
      try {
        pedir().then(function (resposta) {
          if (resposta !== 'granted') return;
          window.addEventListener('deviceorientation', lerTombo);
          ouvindoTombo = true;
        }).catch(function () {});
      } catch (erro) { /* recusado: segue com a gravidade para baixo */ }
    } else {
      window.addEventListener('deviceorientation', lerTombo);
      ouvindoTombo = true;
    }
  }

  /* --- o interruptor da gravidade ---------------------------- */
  function virarGravidade(ligar) {
    caindo = (ligar === undefined) ? !caindo : Boolean(ligar);
    document.documentElement.classList.toggle('gravidade', caindo);

    var botao = document.querySelector('[data-gravidade]');
    if (botao) botao.setAttribute('aria-pressed', String(caindo));

    /* Ao desligar, ninguém é arremessado de volta: o peso simplesmente
       deixa de existir e cada objeto sai do repouso pela corrente,
       como quem se solta do chão. Lançar todos para cima parecia
       truque; deixar o vácuo reagir sozinho parece física. */
  }

  window.addEventListener('keydown', function (e) {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var alvo = e.target || {};
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName || '') || alvo.isContentEditable) return;
    e.preventDefault();
    virarGravidade();
  });

  var botaoG = document.querySelector('[data-gravidade]');
  if (botaoG) botaoG.addEventListener('click', function () {
    if (!caindo) ouvirTombo();                   // dentro do gesto, como o iOS exige
    virarGravidade();
  });

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
