/* ---------------------------- Mural ---------------------------- */
(() => {
  'use strict';

  const forma = document.getElementById('compor');
  const grade = document.getElementById('notas');
  if (!forma || !grade) return;

  const elTexto = document.getElementById('m-texto');
  const elNome  = document.getElementById('m-nome');
  const elConta = document.getElementById('m-conta');
  const elVazio = document.getElementById('m-vazio');

  const LIMITE = 180;
  const TETO   = 60;
  /* creme sai da roda: nota creme sobre pagina creme desaparece */
  const CORES  = ['var(--amarelo)', 'var(--rosa)', 'var(--lilas)'];
  const GIROS  = ['-1.7deg', '1.3deg', '-0.9deg', '1.9deg', '-2.1deg'];

  /* Um unico objeto fala com o armazenamento, os dois modos atras da
     mesma porta.

     Com API: mural de verdade, todo mundo ve os mesmos recados. Sem
     API: cada visitante ve so os proprios, no navegador dele.

     Quando a API existe e a rede falha, o mural mostra erro em vez de
     cair para o local — mostrar os recados antigos de quem esta
     olhando, como se fossem o mural, seria mentir. */
  const Mural = {
    remoto(){ return Boolean(API); },

    async ler(){
      if (!API){
        try {
          const bruto = JSON.parse(localStorage.getItem('kiq:mural') || '[]');
          return Array.isArray(bruto) ? bruto.filter((n) => n && typeof n.texto === 'string') : [];
        } catch { return []; }
      }
      const r = await fetch(API + '/mural');
      if (!r.ok) throw new Error('mural indisponivel');
      const c = await r.json();
      return Array.isArray(c.notas) ? c.notas : [];
    },

    async colar(nota){
      if (!API){
        try {
          const lista = await Mural.ler();
          lista.unshift(nota);
          localStorage.setItem('kiq:mural', JSON.stringify(lista.slice(0, TETO)));
        } catch {}
        return;
      }
      const r = await fetch(API + '/mural', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto: nota.texto, nome: nota.nome })
      });
      if (!r.ok){
        /* so mensagem escrita por mim chega ate quem visita: erro cru de
           rede ("Failed to fetch") nao diz nada pra ninguem */
        const meu = new Error('recusado pelo servidor');
        meu.amigavel = r.status === 429
          ? 'Calma, muitos recados seguidos. Tenta daqui a pouco.'
          : 'O servidor não aceitou o recado.';
        throw meu;
      }
    },

    async tirar(id){
      if (!API){
        try {
          const lista = await Mural.ler();
          localStorage.setItem('kiq:mural',
            JSON.stringify(lista.filter((n) => n.id !== id)));
        } catch {}
        return;
      }
      const r = await fetch(API + '/mural/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'x-dono': Dono.chave() }
      });
      if (!r.ok) throw new Error('Não consegui tirar.');
    }
  };

  function quando(iso){
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  async function pintar(){
    let lista;
    try {
      lista = await Mural.ler();
    } catch {
      grade.textContent = '';
      elVazio.hidden = false;
      elVazio.textContent = 'Não consegui carregar o mural agora. Tenta recarregar.';
      return;
    }

    grade.textContent = '';
    elVazio.hidden = lista.length > 0;
    elVazio.textContent = 'Nada colado ainda. Começa você.';

    lista.forEach((n, i) => {
      const nota = document.createElement('article');
      nota.className = 'nota';
      nota.style.setProperty('--bg', CORES[(n.cor ?? i) % CORES.length]);
      nota.style.setProperty('--tilt', GIROS[(n.cor ?? i) % GIROS.length]);
      nota.style.setProperty('--atraso', Math.min(i * 0.045, 0.5).toFixed(3) + 's');

      /* textContent, nunca innerHTML: o texto vem de quem escreveu e
         nao pode virar marcacao */
      const txt = document.createElement('p');
      txt.className = 'nota-txt';
      txt.textContent = n.texto;

      const pe = document.createElement('footer');
      pe.className = 'nota-pe';

      const quem = document.createElement('span');
      const data = quando(n.em);
      quem.textContent = (n.nome || 'anônimo') + (data ? ' · ' + data : '');

      pe.append(quem);

      /* mural coletivo: so o dono tira. mural local: e do proprio
         visitante, entao ele tira o que quiser */
      if (!Mural.remoto() || Dono.sou()){
        const tirar = document.createElement('button');
        tirar.type = 'button';
        tirar.className = 'tirar';
        tirar.setAttribute('aria-label', 'Tirar o recado de ' + (n.nome || 'anônimo'));
        tirar.textContent = '\u00d7';
        tirar.addEventListener('click', async () => {
          try { await Mural.tirar(n.id); } catch {}
          pintar();
        });
        pe.append(tirar);
      }
      nota.append(txt, pe);
      grade.append(nota);
    });
  }

  function contar(){
    const resta = LIMITE - elTexto.value.length;
    elConta.textContent = String(resta);
    elConta.dataset.cheio = resta <= 20 ? 'sim' : 'nao';
  }

  elTexto.addEventListener('input', contar);

  const enviar = forma.querySelector('button[type=submit]');

  forma.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = elTexto.value.trim();
    if (!texto) return;

    enviar.disabled = true;
    try {
      await Mural.colar({
        id: String(Date.now()) + Math.random().toString(36).slice(2, 7),
        texto: texto.slice(0, LIMITE),
        nome: elNome.value.trim().slice(0, 24),
        cor: Math.floor(Math.random() * CORES.length),
        em: new Date().toISOString()
      });
      elTexto.value = '';
      contar();
      await pintar();
      elTexto.focus();
    } catch (erro) {
      elVazio.hidden = false;
      elVazio.textContent = erro.amigavel
        || 'Não consegui colar agora. Confere a internet e tenta de novo.';
    } finally {
      enviar.disabled = false;
    }
  });

  contar();
  pintar();
})();
