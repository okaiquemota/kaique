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
`VEL_DERIVA`, `VEL_MIN`…).

Sobre `prefers-reduced-motion: reduce`: essa preferência deixa a deriva ambiente mais
lenta (fator `brisa`), mas **não desliga a física**. Arrastar e arremessar são resposta
ao gesto do próprio usuário, não animação que roda sozinha — matá-los quebrava a página
para quem tem a preferência ligada, sem ganho nenhum de acessibilidade. O que essa
preferência desliga é o balanço decorativo em `@keyframes`, pelo CSS.

`VEL_MIN` é um piso de velocidade: sem ele a caminhada aleatória da corrente
eventualmente cancela a si mesma e o objeto fica parado no vácuo.

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

**O `href` sai do elemento.** Qualquer listener de clique em fase de captura no `window`
roda antes de qualquer listener no elemento — captura desce do `window` para o alvo, e
não existe ordem de registro que mude isso. O visualizador de artifacts do Claude injeta
exatamente esse listener: procura o `closest('a[href]')` e manda o shell navegar. Quando
o nosso `preventDefault` executa, a navegação já foi disparada.

Por isso `js/fisica.js` guarda o destino em memória e **remove o atributo `href`** na
entrada (repondo `role="link"` e `tabindex`). Sem `href` não existe o que interceptar. O
`href` volta por um instante só na ativação real, dentro de `ativar()`. Sem JS a página
degrada bem: os `href` continuam no HTML e viram links comuns.



No desktop, apertar e puxar um `<a>` faz o navegador iniciar o **drag-and-drop nativo
de link**, e a partir daí o fluxo de `pointermove` simplesmente para. No toque isso não
existe — era por isso que só o mouse quebrava.

Barrar o arraste nativo é a primeira metade (`preventDefault` no `pointerdown` **e** no
`mousedown`, que é de onde ele de fato nasce, mais `draggable="false"` e
`-webkit-user-drag: none`). Mas depender só disso é frágil: qualquer camada acima — o
iframe de um visualizador, uma extensão — pode capturar o ponteiro do mesmo jeito.

Por isso o veredito sobre o clique **não depende de `pointermove` nenhum**: ele compara
as coordenadas do próprio evento de `click` com o ponto onde o `pointerdown` desceu. Se
o ponteiro subiu longe de onde desceu, foi arrasto, e o clique é cancelado — não importa
quantos eventos se perderam no meio. Pelo mesmo motivo o rastreamento escuta na `window`,
não no card.

Cliques de teclado (`detail === 0`) nunca são cancelados.

### Um clique seleciona, dois abrem

Este é o contrato de interação da página, e ele é deliberado: no meio de objetos que
boiam e podem ser arrastados, um clique simples é ambíguo demais — muitas vezes é o
começo de um arrasto. Então:

- **um clique** apenas seleciona o objeto (`.esta-selecionado`, que acende o halo na cor
  dele). Clicar no vácuo tira a seleção;
- **dois cliques rápidos** ativam de verdade — o `<a>` navega, o `[data-abre]` abre o modal;
- **arrastar** nunca ativa nada.

Repare que **o seu script não precisa saber disso**. Todo clique simples é cancelado em
fase de captura; no duplo clique a física chama `el.click()`, que nasce com `detail === 0`
e por isso atravessa o próprio filtro. O que chega no seu listener é um `click` comum.

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
