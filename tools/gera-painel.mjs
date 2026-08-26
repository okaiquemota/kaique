/* Gera css/painel.css a partir de css/paginas.css.
   ------------------------------------------------------------
   As paginas internas viram modal dentro da capa. A folha delas
   nasce com :root e body, que pintariam a capa inteira ao abrir
   o painel — entao aqui cada seletor ganha o escopo `.painel`, e
   as tres raizes (:root, html, body) viram o proprio `.painel`.

   Rodar:  node tools/gera-painel.mjs
*/
import { readFileSync, writeFileSync } from 'node:fs';

const ENTRADA = new URL('../css/paginas.css', import.meta.url);
const SAIDA   = new URL('../css/painel.css',  import.meta.url);

const RAIZES = new Set([':root', 'html', 'body']);

/* :root/html/body sao a propria folha; o resto vive dentro dela. */
function escopar(seletor) {
  const s = seletor.trim();
  if (!s) return s;
  if (RAIZES.has(s)) return '.painel';
  /* `body::before`, `html.x` e afins: so a raiz e substituida */
  for (const raiz of RAIZES) {
    if (s.startsWith(raiz) && /^[.:#\[]/.test(s.slice(raiz.length))) {
      return '.painel' + s.slice(raiz.length);
    }
  }
  return '.painel ' + s;
}

function escoparLista(lista) {
  return lista
    .split(',')
    .map(escopar)
    .join(',\n');
}

/* Percorre o CSS de chave em chave. Blocos aninhados (@media, @supports)
   sao reescritos por dentro; @keyframes passam intactos, porque `from`,
   `to` e as porcentagens nao sao seletores. */
function reescrever(css) {
  let saida = '';
  let i = 0;
  let prefacio = '';        /* comentarios e espacos antes do seletor */

  while (i < css.length) {
    const c = css[i];

    /* espaco e comentario ficam guardados: eles pertencem ao que vem
       depois, e sem isso o comentario entraria no meio do seletor */
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') {
      prefacio += c;
      i++;
      continue;
    }

    if (c === '/' && css[i + 1] === '*') {
      const fim = css.indexOf('*/', i + 2);
      const ate = fim === -1 ? css.length : fim + 2;
      prefacio += css.slice(i, ate);
      i = ate;
      continue;
    }

    if (c === '{') { i++; continue; }   /* nunca deveria cair aqui */

    /* junta tudo ate a proxima chave ou ponto-e-virgula */
    let j = i;
    while (j < css.length && css[j] !== '{' && css[j] !== '}' && css[j] !== ';') j++;

    if (j >= css.length) { saida += prefacio + css.slice(i); break; }

    if (css[j] === ';') {                /* declaracao solta: @import, @charset */
      saida += prefacio + css.slice(i, j + 1);
      prefacio = '';
      i = j + 1;
      continue;
    }

    if (css[j] === '}') {                /* fecha um bloco de fora */
      saida += prefacio + css.slice(i, j + 1);
      prefacio = '';
      i = j + 1;
      continue;
    }

    /* css[j] === '{' : achamos um bloco */
    const cabeca = css.slice(i, j);
    const corpo = fatiarBloco(css, j);   /* { ... } equilibrado */
    const dentro = corpo.texto.slice(1, -1);

    const nome = cabeca.trim();
    const espacoAntes = cabeca.slice(0, cabeca.length - cabeca.trimStart().length);

    if (nome.startsWith('@')) {
      const atRegra = nome.split(/\s/)[0].toLowerCase();
      /* keyframes tem `from`/`to`/`50%` no lugar de seletor: nao se escopa */
      const miolo = atRegra.includes('keyframes') ? dentro : reescrever(dentro);
      saida += prefacio + espacoAntes + nome + ' {' + miolo + '}';
    } else {
      saida += prefacio + espacoAntes + escoparLista(nome) + ' {' + dentro + '}';
    }

    prefacio = '';
    i = corpo.fim;
  }

  return saida + prefacio;
}

/* devolve o bloco { ... } que comeca em `abre`, com as chaves equilibradas */
function fatiarBloco(css, abre) {
  let nivel = 0;
  for (let k = abre; k < css.length; k++) {
    if (css[k] === '{') nivel++;
    else if (css[k] === '}') {
      nivel--;
      if (nivel === 0) return { texto: css.slice(abre, k + 1), fim: k + 1 };
    }
  }
  return { texto: css.slice(abre) + '}', fim: css.length };
}

const CABECALHO =
`/* GERADO por tools/gera-painel.mjs a partir de css/paginas.css — nao edite aqui.
   E a mesma folha, reescrita para viver dentro de .painel: sem isso
   o :root e o body dela pintariam a capa inteira ao abrir o modal. */
`;

const fonte = readFileSync(ENTRADA, 'utf8');
writeFileSync(SAIDA, CABECALHO + reescrever(fonte).replace(/^\s+/, ''), 'utf8');
console.log('css/painel.css gerado a partir de css/paginas.css');
