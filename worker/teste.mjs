/**
 * Testes da API, contra SQLite de verdade.
 *
 * O D1 da Cloudflare tem a mesma forma de `prepare().bind().first()/
 * .all()/.run()`, então um adaptador fino sobre node:sqlite roda o
 * Worker de verdade — as consultas SQL são exercitadas, não fingidas.
 *
 *   node --experimental-sqlite worker/teste.mjs
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import api from './src/index.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const ORIGEM = 'https://okaiquemota.github.io';

/* ---------------------- adaptador D1 sobre sqlite ---------------------- */

function fazD1(db) {
  return {
    prepare(sql) {
      const st = db.prepare(sql);
      let params = [];
      const api = {
        bind(...args) { params = args; return api; },
        first() { const r = st.get(...params); return r === undefined ? null : r; },
        all()   { return { results: st.all(...params), success: true }; },
        run()   { st.run(...params); return { success: true }; }
      };
      return api;
    }
  };
}

function novoAmbiente() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(join(aqui, 'schema.sql'), 'utf8'));
  return {
    db,
    env: {
      DB: fazD1(db),
      ORIGENS: ORIGEM + ',https://kaiquemota.com.br',
      SAL: 'sal-de-teste',
      SEGREDO_DONO: 'segredo-do-kiq-1234'
    }
  };
}

/* ----------------------------- utilidades ----------------------------- */

function pedir(caminho, opcoes = {}) {
  const { metodo = 'GET', corpo, origem = ORIGEM, ip = '10.0.0.1', dono } = opcoes;
  const cab = { 'CF-Connecting-IP': ip };
  if (origem !== null) cab.Origin = origem;
  if (corpo !== undefined) cab['content-type'] = 'application/json';
  if (dono !== undefined) cab['x-dono'] = dono;
  return new Request('https://api.exemplo/' + caminho.replace(/^\//, ''), {
    method: metodo,
    headers: cab,
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
}

let passou = 0;
const falhas = [];

function conferir(nome, condicao, detalhe) {
  if (condicao) { passou += 1; return; }
  falhas.push(nome + (detalhe ? ' -> ' + detalhe : ''));
}

/* -------------------------------- testes -------------------------------- */

async function rodar() {
  // ---------- CORS ----------
  {
    const { env } = novoAmbiente();

    const pre = await api.fetch(pedir('/placar', { metodo: 'OPTIONS' }), env);
    conferir('OPTIONS de origem conhecida responde 204',
      pre.status === 204, 'status ' + pre.status);
    conferir('OPTIONS devolve a origem no cabeçalho',
      pre.headers.get('access-control-allow-origin') === ORIGEM);

    const intruso = await api.fetch(
      pedir('/placar', { metodo: 'OPTIONS', origem: 'https://site-de-outro.com' }), env);
    conferir('OPTIONS de origem estranha responde 403',
      intruso.status === 403, 'status ' + intruso.status);
    conferir('e não devolve cabeçalho de CORS',
      intruso.headers.get('access-control-allow-origin') === null);

    const semOrigem = await api.fetch(pedir('/mural', { origem: null }), env);
    conferir('pedido sem Origin é recusado', semOrigem.status === 403);

    const perdido = await api.fetch(pedir('/nao-existe'), env);
    conferir('rota desconhecida responde 404', perdido.status === 404);
  }

  // ---------- placar ----------
  {
    const { env, db } = novoAmbiente();

    let r = await api.fetch(pedir('/placar?jogo=genio'), env);
    let c = await r.json();
    conferir('placar começa vazio', r.status === 200 && c.topo.length === 0);

    r = await api.fetch(pedir('/placar?jogo=paciencia'), env);
    conferir('jogo desconhecido na leitura responde 400', r.status === 400);

    r = await api.fetch(pedir('/placar', {
      metodo: 'POST', corpo: { jogo: 'genio', nome: 'kiq', pontos: 12 }, ip: '10.0.0.2'
    }), env);
    c = await r.json();
    conferir('grava pontuação e devolve o topo',
      r.status === 200 && c.topo.length === 1 && c.topo[0].pontos === 12,
      JSON.stringify(c));

    for (const [rotulo, pontos] of [
      ['999999', 999999], ['zero', 0], ['negativa', -5], ['quebrada', 3.7], ['texto', 'dez']
    ]) {
      const s = await api.fetch(pedir('/placar', {
        metodo: 'POST', corpo: { jogo: 'genio', nome: 'trapaceiro', pontos }, ip: '10.0.0.3'
      }), env);
      conferir('pontuação ' + rotulo + ' é recusada', s.status === 400, 'status ' + s.status);
    }

    const teto = await api.fetch(pedir('/placar', {
      metodo: 'POST', corpo: { jogo: 'cobrinha', nome: 'x', pontos: 359 }, ip: '10.0.0.4'
    }), env);
    conferir('cobrinha acima do tabuleiro é recusada', teto.status === 400);

    // mesma pessoa duas vezes: fica a melhor, uma linha só no topo
    await api.fetch(pedir('/placar', {
      metodo: 'POST', corpo: { jogo: 'genio', nome: 'kiq', pontos: 4 }, ip: '10.0.0.5'
    }), env);
    r = await api.fetch(pedir('/placar?jogo=genio'), env);
    c = await r.json();
    conferir('mantém a melhor marca por pessoa, sem repetir o nome',
      c.topo.length === 1 && c.topo[0].pontos === 12, JSON.stringify(c.topo));

    // nome vazio vira anônimo
    await api.fetch(pedir('/placar', {
      metodo: 'POST', corpo: { jogo: 'genio', nome: '   ', pontos: 7 }, ip: '10.0.0.6'
    }), env);
    r = await api.fetch(pedir('/placar?jogo=genio'), env);
    c = await r.json();
    conferir('nome em branco vira anônimo',
      c.topo.some((l) => l.nome === 'anônimo'), JSON.stringify(c.topo));

    const guardado = db.prepare('SELECT ip FROM placar LIMIT 1').get();
    conferir('o endereço não é guardado em claro',
      /^[0-9a-f]{16}$/.test(guardado.ip) && !guardado.ip.includes('10.0.0'),
      guardado.ip);
  }

  // ---------- limite de escrita ----------
  {
    const { env } = novoAmbiente();
    const ip = '10.9.9.9';
    let bloqueouNa = null;
    for (let i = 1; i <= 10; i++) {
      const r = await api.fetch(pedir('/placar', {
        metodo: 'POST', corpo: { jogo: 'genio', nome: 'spam', pontos: 3 }, ip
      }), env);
      if (r.status === 429 && bloqueouNa === null) bloqueouNa = i;
    }
    conferir('trava depois de 8 escritas no mesmo minuto',
      bloqueouNa === 9, 'travou na tentativa ' + bloqueouNa);

    const outro = await api.fetch(pedir('/placar', {
      metodo: 'POST', corpo: { jogo: 'genio', nome: 'gente', pontos: 3 }, ip: '10.9.9.8'
    }), env);
    conferir('o limite é por endereço, não global', outro.status === 200);
  }

  // ---------- mural ----------
  {
    const { env, db } = novoAmbiente();

    let r = await api.fetch(pedir('/mural'), env);
    let c = await r.json();
    conferir('mural começa vazio', r.status === 200 && c.notas.length === 0);

    r = await api.fetch(pedir('/mural', {
      metodo: 'POST', corpo: { texto: 'oi, sumido', nome: 'maria' }, ip: '10.1.0.1'
    }), env);
    c = await r.json();
    const idNota = c.nota && c.nota.id;
    conferir('cola um recado', r.status === 201 && c.nota.texto === 'oi, sumido',
      JSON.stringify(c));
    conferir('o recado ganha id, cor e data',
      /^[0-9a-f]{20}$/.test(idNota) && c.nota.cor >= 0 && c.nota.cor <= 2 && !!c.nota.em,
      JSON.stringify(c.nota));

    for (const [rotulo, texto] of [['vazio', ''], ['só espaço', '   '], ['ausente', undefined]]) {
      const s = await api.fetch(pedir('/mural', {
        metodo: 'POST', corpo: { texto, nome: 'x' }, ip: '10.1.0.2'
      }), env);
      conferir('recado ' + rotulo + ' é recusado', s.status === 400, 'status ' + s.status);
    }

    const sujo = 'com \u0007\u0001 controle aqui';
    r = await api.fetch(pedir('/mural', {
      metodo: 'POST', corpo: { texto: sujo, nome: 'z' }, ip: '10.1.0.3'
    }), env);
    c = await r.json();
    conferir('caracteres de controle são retirados do texto',
      c.nota.texto === 'com controle aqui', JSON.stringify(c.nota.texto));

    r = await api.fetch(pedir('/mural', {
      metodo: 'POST',
      corpo: { texto: 'linha um' + '\n'.repeat(40) + 'linha dois', nome: 'y' },
      ip: '10.1.0.31'
    }), env);
    c = await r.json();
    conferir('uma pilha de quebras de linha não estica o post-it',
      c.nota.texto === 'linha um linha dois', JSON.stringify(c.nota.texto));

    r = await api.fetch(pedir('/mural', {
      metodo: 'POST', corpo: { texto: 'a'.repeat(400), nome: 'b'.repeat(80) }, ip: '10.1.0.4'
    }), env);
    c = await r.json();
    conferir('texto e nome são cortados no limite',
      c.nota.texto.length === 180 && c.nota.nome.length === 24,
      c.nota.texto.length + '/' + c.nota.nome.length);

    // ---------- apagar ----------
    let d = await api.fetch(pedir('/mural/' + idNota, { metodo: 'DELETE', ip: '10.1.0.5' }), env);
    conferir('apagar sem segredo responde 401', d.status === 401);

    d = await api.fetch(pedir('/mural/' + idNota, {
      metodo: 'DELETE', dono: 'chute-errado', ip: '10.1.0.5'
    }), env);
    conferir('apagar com segredo errado responde 401', d.status === 401);

    d = await api.fetch(pedir('/mural/' + idNota, {
      metodo: 'DELETE', dono: 'segredo-do-kiq-1234', ip: '10.1.0.5'
    }), env);
    conferir('o dono apaga', d.status === 200);

    r = await api.fetch(pedir('/mural'), env);
    c = await r.json();
    conferir('o recado apagado sumiu do mural',
      !c.notas.some((n) => n.id === idNota));

    // ---------- teto do mural ----------
    const base = Date.now();
    for (let i = 0; i < 70; i++) {
      db.prepare('INSERT INTO mural (id, texto, nome, cor, ip, em) VALUES (?,?,?,?,?,?)')
        .run('velho' + String(i).padStart(15, '0'), 'antigo ' + i, 'gente', 0, 'aaaa',
             new Date(base - (70 - i) * 1000).toISOString());
    }
    await api.fetch(pedir('/mural', {
      metodo: 'POST', corpo: { texto: 'o mais novo de todos' }, ip: '10.1.0.9'
    }), env);
    const quantas = db.prepare('SELECT COUNT(*) AS n FROM mural').get().n;
    conferir('o mural para de crescer em 60 recados', quantas === 60, 'ficaram ' + quantas);

    r = await api.fetch(pedir('/mural'), env);
    c = await r.json();
    conferir('o recado mais novo continua no topo',
      c.notas[0].texto === 'o mais novo de todos', c.notas[0].texto);
  }

  /* ------------- o site e o servidor conhecem os mesmos jogos ------------- */
  {
    /* Este e o teste que pega a classe de bug que ja aconteceu: jogos
       novos entraram no site e o servidor continuou aceitando so dois,
       entao o ranking deles nunca aparecia. */
    const site = [...readFileSync(join(aqui, '..', 'jogos.js'), 'utf8')
      .matchAll(/const JOGO = '([a-z]+)'/g)].map((m) => m[1]);

    const servidor = [...readFileSync(join(aqui, 'src', 'index.js'), 'utf8')
      .match(/const JOGOS = \{([\s\S]*?)\};/)[1]
      .matchAll(/^\s*([a-z]+)\s*:/gm)].map((m) => m[1]);

    conferir('o site tem jogos', site.length > 0, String(site.length));

    const orfaos = site.filter((j) => !servidor.includes(j));
    conferir('todo jogo do site e aceito pelo servidor',
      orfaos.length === 0,
      'sem ranking: ' + orfaos.join(', '));

    const sobrando = servidor.filter((j) => !site.includes(j));
    conferir('o servidor nao aceita jogo que nao existe mais no site',
      sobrando.length === 0,
      'sobrando: ' + sobrando.join(', '));

    /* e cada um responde de verdade */
    const { env } = novoAmbiente();
    const recusados = [];
    for (const jogo of site) {
      const r = await api.fetch(pedir('/placar?jogo=' + jogo), env);
      if (r.status !== 200) recusados.push(jogo + ' (' + r.status + ')');
    }
    conferir('o placar responde para cada jogo do site',
      recusados.length === 0, recusados.join(', '));
  }

  /* ------------------------------ resultado ------------------------------ */

  console.log('');
  console.log(passou + ' verificações passaram');
  if (falhas.length) {
    console.log('');
    console.log(falhas.length + ' FALHARAM:');
    for (const f of falhas) console.log('  - ' + f);
    process.exitCode = 1;
  } else {
    console.log('nenhuma falha');
  }
}

rodar().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
