/**
 * API do kiq.portfolio — placar dos jogos e mural de recados.
 *
 * Roda na Cloudflare, guarda em D1. O site continua no GitHub Pages e
 * chama esta API de fora, por isso todo o CORS é explícito.
 *
 * Rotas:
 *   GET    /placar?jogo=genio     topo 10 do jogo
 *   POST   /placar                { jogo, nome, pontos }
 *   GET    /mural                 recados mais recentes
 *   POST   /mural                 { texto, nome }
 *   DELETE /mural/:id             só o dono, cabeçalho x-dono
 */

/* Teto plausível por jogo. Não impede trapaça — quem abre o console do
   navegador manda o que quiser — mas corta o 999999 preguiçoso. */
const JOGOS = {
  genio: 60,      // sequência de 60 já é absurda
  cobrinha: 358,  // 19*19 casas menos o tamanho inicial da cobra
  corrida: 500,   // desvio de cones, sem fim: teto generoso
  mira: 300,      // cada alvo tem tempo limite, entao 300 e muita coisa
  kiwi: 500,      // flappy: os melhores do mundo passam de 200
  stack: 300      // os andares encolhem, na pratica acaba bem antes
};

const LIMITE_TEXTO = 180;
const LIMITE_NOME  = 24;
const TETO_MURAL   = 60;
const TOPO         = 10;

const JANELA_MS  = 60000;
const POR_JANELA = 8;

const TABELAS = new Set(['placar', 'mural']);

/* ------------------------------- CORS ------------------------------- */

function origemPermitida(pedido, env) {
  const origem = pedido.headers.get('Origin');
  if (!origem) return null;
  const lista = String(env.ORIGENS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return lista.includes(origem) ? origem : null;
}

function cabecalhos(origem) {
  const h = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  };
  if (origem) {
    h['access-control-allow-origin']  = origem;
    h['access-control-allow-methods'] = 'GET, POST, DELETE, OPTIONS';
    h['access-control-allow-headers'] = 'content-type, x-dono';
    h['access-control-max-age']       = '86400';
    h['vary']                         = 'Origin';
  }
  return h;
}

const json = (corpo, status, origem) =>
  new Response(JSON.stringify(corpo), { status, headers: cabecalhos(origem) });

/* ----------------------------- utilidades ----------------------------- */

/**
 * Tira caracteres de controle, junta corridas de espaco em branco,
 * apara as pontas e corta no limite.
 *
 * Juntar o espaco em branco nao e cosmetico: sem isso da para colar
 * 180 quebras de linha e esticar um post-it pela pagina inteira.
 */
function limpar(valor, max) {
  return String(valor == null ? '' : valor)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** O endereço nunca é guardado em claro: só um hash curto, com sal. */
async function marcaDeIp(pedido, env) {
  const ip = pedido.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const bytes = new TextEncoder().encode(String(env.SAL || '') + '|' + ip);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function escreveuDemais(env, tabela, ip) {
  /* o nome da tabela entra na consulta por concatenação, então nunca
     pode vir de fora: só destes dois literais */
  if (!TABELAS.has(tabela)) throw new Error('tabela desconhecida');
  const desde = new Date(Date.now() - JANELA_MS).toISOString();
  const linha = await env.DB
    .prepare('SELECT COUNT(*) AS n FROM ' + tabela + ' WHERE ip = ? AND em > ?')
    .bind(ip, desde)
    .first();
  return Number((linha && linha.n) || 0) >= POR_JANELA;
}

/** Comparação de tempo constante, para o segredo não vazar pelo relógio. */
function ehDono(pedido, env) {
  const dado  = pedido.headers.get('x-dono') || '';
  const certo = String(env.SEGREDO_DONO || '');
  if (!certo || dado.length !== certo.length) return false;
  let diferenca = 0;
  for (let i = 0; i < certo.length; i++) {
    diferenca |= dado.charCodeAt(i) ^ certo.charCodeAt(i);
  }
  return diferenca === 0;
}

async function corpoJson(pedido) {
  try {
    return await pedido.json();
  } catch {
    return null;
  }
}

/* ------------------------------- placar ------------------------------- */

async function lerPlacar(jogo, env, origem) {
  if (!Object.prototype.hasOwnProperty.call(JOGOS, jogo)) {
    return json({ erro: 'jogo desconhecido' }, 400, origem);
  }

  /* melhor pontuação por pessoa: senão uma só enche o quadro inteiro */
  const saida = await env.DB
    .prepare(
      'SELECT nome, MAX(pontos) AS pontos, MAX(em) AS em' +
      '  FROM placar WHERE jogo = ?' +
      ' GROUP BY nome ORDER BY pontos DESC, em ASC LIMIT ?'
    )
    .bind(jogo, TOPO)
    .all();

  return json({ topo: saida.results || [] }, 200, origem);
}

async function gravarPlacar(pedido, env, origem) {
  const corpo = await corpoJson(pedido);
  if (!corpo) return json({ erro: 'corpo inválido' }, 400, origem);

  const jogo = String(corpo.jogo || '');
  if (!Object.prototype.hasOwnProperty.call(JOGOS, jogo)) {
    return json({ erro: 'jogo desconhecido' }, 400, origem);
  }

  const pontos = Number(corpo.pontos);
  if (!Number.isInteger(pontos) || pontos < 1 || pontos > JOGOS[jogo]) {
    return json({ erro: 'pontuação implausível' }, 400, origem);
  }

  const nome = limpar(corpo.nome, LIMITE_NOME) || 'anônimo';
  const ip = await marcaDeIp(pedido, env);
  if (await escreveuDemais(env, 'placar', ip)) {
    return json({ erro: 'devagar aí' }, 429, origem);
  }

  await env.DB
    .prepare('INSERT INTO placar (jogo, nome, pontos, ip, em) VALUES (?, ?, ?, ?, ?)')
    .bind(jogo, nome, pontos, ip, new Date().toISOString())
    .run();

  return lerPlacar(jogo, env, origem);
}

/* -------------------------------- mural -------------------------------- */

async function lerMural(env, origem) {
  const saida = await env.DB
    .prepare('SELECT id, texto, nome, cor, em FROM mural ORDER BY em DESC LIMIT ?')
    .bind(TETO_MURAL)
    .all();
  return json({ notas: saida.results || [] }, 200, origem);
}

async function gravarMural(pedido, env, origem) {
  const corpo = await corpoJson(pedido);
  if (!corpo) return json({ erro: 'corpo inválido' }, 400, origem);

  const texto = limpar(corpo.texto, LIMITE_TEXTO);
  if (!texto) return json({ erro: 'recado vazio' }, 400, origem);

  const nome = limpar(corpo.nome, LIMITE_NOME);
  const ip = await marcaDeIp(pedido, env);
  if (await escreveuDemais(env, 'mural', ip)) {
    return json({ erro: 'devagar aí' }, 429, origem);
  }

  const nota = {
    id: crypto.randomUUID().replace(/-/g, '').slice(0, 20),
    texto: texto,
    nome: nome,
    cor: Math.floor(Math.random() * 3),
    em: new Date().toISOString()
  };

  await env.DB
    .prepare('INSERT INTO mural (id, texto, nome, cor, ip, em) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(nota.id, nota.texto, nota.nome, nota.cor, ip, nota.em)
    .run();

  /* o mural não cresce sem fim: fica só com os mais recentes */
  await env.DB
    .prepare(
      'DELETE FROM mural WHERE id NOT IN' +
      ' (SELECT id FROM mural ORDER BY em DESC LIMIT ?)'
    )
    .bind(TETO_MURAL)
    .run();

  return json({ nota: nota }, 201, origem);
}

async function tirarDoMural(pedido, id, env, origem) {
  if (!ehDono(pedido, env)) return json({ erro: 'só o dono' }, 401, origem);
  await env.DB.prepare('DELETE FROM mural WHERE id = ?').bind(id).run();
  return json({ ok: true }, 200, origem);
}

/* ------------------------------ roteamento ------------------------------ */

export default {
  async fetch(pedido, env) {
    const origem = origemPermitida(pedido, env);

    if (pedido.method === 'OPTIONS') {
      return origem
        ? new Response(null, { status: 204, headers: cabecalhos(origem) })
        : new Response(null, { status: 403 });
    }
    if (!origem) return json({ erro: 'origem não autorizada' }, 403, null);

    const url = new URL(pedido.url);

    try {
      if (url.pathname === '/placar') {
        if (pedido.method === 'GET') {
          return await lerPlacar(String(url.searchParams.get('jogo') || ''), env, origem);
        }
        if (pedido.method === 'POST') return await gravarPlacar(pedido, env, origem);
      }
      if (url.pathname === '/mural') {
        if (pedido.method === 'GET')  return await lerMural(env, origem);
        if (pedido.method === 'POST') return await gravarMural(pedido, env, origem);
      }
      const alvo = url.pathname.match(/^\/mural\/([A-Za-z0-9_-]{1,40})$/);
      if (alvo && pedido.method === 'DELETE') {
        return await tirarDoMural(pedido, alvo[1], env, origem);
      }
      return json({ erro: 'não encontrado' }, 404, origem);
    } catch (erro) {
      console.error(erro);
      return json({ erro: 'falha no servidor' }, 500, origem);
    }
  }
};
