# Portfólio — Kaique Mota

Portfólio no conceito **Gravidade Zero** (spatial navigation / infinite canvas),
em dark mode sobre preto puro.

```
index.html
css/style.css
js/fisica.js
```

Abra o `index.html` no navegador. Não precisa de build.

**Dependências externas:** só as fontes Playfair Display e Caveat, via Google Fonts.
Se quiser voltar a zero dependências, remova as 3 linhas de `<link>` do `<head>` —
o CSS já cai para `Georgia` e a cursiva do sistema.

## As três camadas de transform

Esta é a decisão que sustenta o resto. Três coisas precisam mover o mesmo card ao
mesmo tempo, então cada uma tem seu próprio elemento — se duas dividissem o mesmo,
uma apagaria a outra:

| Elemento | Move o quê | Quem escreve |
| --- | --- | --- |
| `.orbe` | a posição na tela | `js/fisica.js` |
| `.orbe__flutua` | o balanço contínuo | `@keyframes` do CSS |
| `.orbe__face` | a escala do `:hover` | `transition` do CSS |

O balanço são 5 curvas diferentes (`flutuar-a` … `flutuar-e`) com durações de 5s a 9s
e fase negativa distinta em cada card, para nada entrar em sincronia. A amplitude sai
do token `--amp`, que os media queries reduzem no mobile — o sistema inteiro encolhe
sem reescrever keyframe nenhum.

## A física (`js/fisica.js`)

JavaScript puro, sem biblioteca. Faz três coisas:

- **Deriva** — cada card vagueia sozinho pela página, empurrado por uma corrente
  aleatória fraca, como tralha boiando na água.
- **Colisão** — cards batem entre si e nas bordas da tela, com perda de energia.
- **Arrasto** — segurar e mover leva o card junto; ao soltar, ele sai com a
  velocidade do arremesso e continua planando.

As posições `top`/`left` do CSS continuam sendo a verdade do layout: a física só
trabalha em cima delas, em deslocamento. Por isso os breakpoints continuam mandando
no arranjo inicial, e o `resize` remede tudo.

Constantes de ajuste ficam no topo do arquivo (`ATRITO`, `RESTITUICAO`, `CORRENTE`,
`VEL_DERIVA`…). Em `prefers-reduced-motion: reduce` a deriva e a corrente são
desligadas, mas o arrasto continua funcionando.

## Plugando os modais

Os dois cards de modal expõem os ganchos:

```html
<button class="orbe orbe--passatempo" data-abre="jogos" aria-haspopup="dialog">…</button>
<button class="orbe orbe--mural"      data-abre="mural" aria-haspopup="dialog">…</button>
```

São `<button>` (e não `<a href>`) porque abrem um diálogo e não navegam. Escute
todos de uma vez:

```js
document.querySelectorAll('[data-abre]').forEach(el => {
  el.addEventListener('click', () => abrirModal(el.dataset.abre)); // "jogos" | "mural"
});
```

### O arraste e o link

No desktop, apertar e puxar um `<a>` faz o navegador iniciar o **drag-and-drop nativo
de link** — ele manda `pointercancel`, o rastreamento morre e o clique de saída acaba
navegando. No toque isso não existe, então o bug era só de mouse. A defesa está em três
camadas: `e.preventDefault()` no `pointerdown` (mata os eventos de mouse de
compatibilidade, que é de onde o arraste nativo nasce), `draggable="false"` nos links e
`-webkit-user-drag: none` no CSS.

**A física não atrapalha esse clique.** Um toque sem arrasto dispara o `click`
normalmente; só o clique que nasce de um arrasto é cancelado — senão largar um card
em cima de outro lugar abriria o modal sem querer. O cancelamento usa um listener em
fase de captura registrado na carga da página, então ele roda antes do seu handler,
inclusive se o seu for delegado no `document`.

## Ícone solto vs. card

GitHub, Instagram e Behance usam o modificador `.orbe--nu`: mesmo esqueleto de três
camadas, mas sem a caixa de vidro e sem texto — é só o ícone do app boiando. Como não
sobra texto visível, o nome acessível vem do `aria-label` (e o `title` dá o tooltip que
o rótulo dava antes).

Passatempo e Mural continuam cards, porque neles a superfície *é* o conteúdo: um é
videogame portátil (o card é o console, com LCD, cruzeta e botões A/B), o outro é
folha de fichário. Por isso os dois também não viram pílula no celular — perderiam
a identidade de objeto. O console também não leva rótulo: a peça já se explica, e o
nome acessível vem do `aria-label`.

## Os satélites

A tralha que boia no fundo (filme 35mm, clipes, tampa de lente, café, cabo USB e o
208 branco) é decorativa e não clicável. O carrinho é SVG desenhado à mão — os outros
são emoji. O emoji é só ocupante do lugar — para plugar seu PNG
transparente, ponha um `<img>` dentro do `<span class="satelite">`; o CSS já
dimensiona sozinho. Cada satélite tem a linha pronta em comentário no HTML.

## O que ajustar

- **Links**: Instagram em `@kiq.ham`; GitHub e Behance ainda em `okaiquemota` — confirme o Behance.
- **Posições iniciais**: bloco *08* do CSS.
- **Cores**: acentos em `--ouro`, `--rosa`, `--azul`, `--ciano`, `--lampada` no `:root`;
  cada card escolhe o seu com `--tom`.
- **Passatempo**: o console inteiro está no bloco *7.1*; a partida que roda na telinha
  é o SVG do ícone.
- **Mural**: não é vidro como os outros — é papel de fichário (régua, margem, grão,
  furos), no bloco *7.2*.

## Acessibilidade

- `:focus-visible` espelha o hover, então dá pra navegar tudo pelo teclado.
- `prefers-reduced-motion: reduce` desliga animações e deriva, mantendo a interação.
- Fallback para navegadores sem `color-mix()`.
