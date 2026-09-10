# Portfólio — Kaique Mota

Portfólio no conceito **Gravidade Zero** (spatial navigation / infinite canvas),
sobre preto puro.

```
index.html
css/style.css
js/fisica.js
```

Abra o `index.html` no navegador. Não precisa de build.

**Dependências externas:** só as fontes Anton e Caveat, via Google Fonts.
Se quiser voltar a zero dependências, remova as 3 linhas de `<link>` do `<head>` —
o CSS já cai para `Impact` e a cursiva do sistema.

## O visual é chapado

Esta é a regra que decide tudo o que vem depois, e ela é uma só: **cor sólida,
forma sólida, contraste alto**. Nada de degradê, vidro, bisel, brilho ou sombra
projetada. O que separa uma peça da outra é a cor; o que separa a peça do fundo
é o preto entre as duas.

Na prática:

- **Cada objeto da capa é uma placa de cor** com o desenho vazado em branco ou
  preto por cima. O SVG é a peça inteira — placa e marca —, então o contêiner só
  dá tamanho.
- **A paleta são oito cores do sistema** mais três emprestadas de marca, no `:root`
  de `css/style.css`. Sete delas — `--magenta`, `--vermelho`, `--creme`, `--limao`,
  `--coral`, `--laranja` e `--azulao` — se repetem valor por valor no `:root` de
  `css/paginas.css`, que é a folha das páginas internas. As outras quatro
  (`--violeta`, `--verde`, `--movcode`, `--forlabs`) **só existem na capa**, porque
  só a capa tem os objetos que as pedem:

  | token | cor | onde manda |
  | --- | --- | --- |
  | `--magenta` | `#ff2d87` | Instagram, botão de ação, 1º do ranking, seleção |
  | `--vermelho` | `#ff3b2f` | @okaiquemota (fotografia), contador no limite |
  | `--violeta` | `#7c3aff` | @imnotkiq |
  | `--creme` | `#ece2d0` | GitHub, Passatempo, Flick, papel do Mural por dentro |
  | `--limao` | `#d4ff3f` | Mural, Kiwi Voador |
  | `--coral` | `#ff9a76` | Cobrinha, 2º do ranking |
  | `--laranja` | `#ff6a13` | Fuga 208 |
  | `--azulao` | `#2b5cff` | Behance, Movcode (o jogo) |
  | `--verde` | `#6ca029` | A Loja do Kiwi |
  | `--movcode` | `#fe6603` | Movcode — o laranja da marca |
  | `--forlabs` | `#4a92ff` | Forlabs — o azul da marca |

  As três últimas são cor emprestada de fora, e é por isso que têm nome
  próprio em vez de entrarem na paleta: elas respondem à marca de alguém,
  não ao sistema daqui.

  **Um nome, uma cor — inclusive dentro do painel.** As duas folhas são carregadas
  juntas no `index.html`, então um token declarado nas duas com valores diferentes
  passa a significar uma coisa na capa e outra dentro do painel, no mesmo documento.
  Foi o que houve com `--verde`: a capa dava a ele o `#6ca029` da Loja do Kiwi e
  `paginas.css` tinha um apelido antigo apontando para o limão. O apelido saiu — não
  tinha um único uso — e hoje `var(--verde)` devolve `#6ca029` em qualquer lugar da
  página. Quem quer o limão pede `var(--limao)`.

  Os apelidos que **ficaram** em `paginas.css` (`--roxo`, `--rosa`, `--amarelo`,
  `--lilas`) são o contrato com os jogos e o mural, que os pedem pelo nome, e nenhum
  deles existe em `style.css` — por isso não há conflito. Ao criar um apelido novo ali,
  confira antes se o nome já está tomado na capa.

  **Os pares próximos são de propósito, e não descuido.** `--limao` (Mural) e
  `--verde` (Loja do Kiwi) são dois verdes; `--azulao` (Behance) e `--forlabs`
  são dois azuis. Em cada par, um dos lados é marca de alguém e não pode mudar,
  e os valores estão distantes o bastante para as peças não se confundirem.
  `--laranja` e `--movcode`, esses sim, são quase a mesma cor — por isso nenhum
  objeto da capa usa `--laranja`: lado a lado só pareceriam erro de impressão.

- **`--tom` é a cor da placa daquele objeto**, e é ela que os anéis de foco e de
  seleção assumem: cada peça acende na própria cor.
- **`--titulo` (Anton, caixa alta) é para rótulo**; a letra de mão (Caveat) ficou
  só para o conteúdo do Mural, onde ela é o próprio recado e não a etiqueta.

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
- **Reação ao cursor** — os objetos se afastam do ponteiro antes de serem tocados. A
  distância é medida da **borda** da peça, não do centro: assim a força cai a zero
  quando o cursor entra em cima dela e dá para mirar e clicar. E o cursor não acelera,
  ele estabelece uma *velocidade de fuga* — no vácuo, aceleração livre guarda tudo que
  recebeu e joga o objeto para o outro lado da tela (medido: 509px numa aproximação de
  um segundo; com a velocidade de fuga, 136px).
- **Gravidade** — a tecla `G`, ou a chave no rodapé, liga o peso: os objetos despencam e
  se empilham. A constante é bem maior que os 9,8 m/s² reais: a tela tem meio metro de
  queda, e no valor certo a coisa parece pena caindo. As quatro bordas devolvem pouco e arrastam na paralela, que é o que faz a
  pilha assentar em vez de quicar para sempre; abaixo de um limiar o objeto desiste e
  descansa. Ao desligar, ninguém é arremessado de volta: o peso simplesmente deixa de
  existir e cada um sai do repouso pela corrente, como quem se solta do chão.
- **Giroscópio** — no celular a gravidade aponta para onde o aparelho está inclinado, e
  não para baixo: `beta` é o tombo para frente/trás, `gamma` para os lados, e o seno de
  cada um dá a componente naquele eixo. Por isso as quatro bordas absorvem igual — a
  pilha se forma contra a parede que estiver por baixo.

  Duas coisas que essa camada exige. **O iOS 13+ só entrega leitura depois de um pedido
  explícito**, e o pedido só vale dentro de um gesto do usuário — é por isso que ele mora
  no clique da chave e não na carga da página, onde seria recusado em silêncio. E **o
  peso deixa de ser liga/desliga**: deitar o telefone na mesa dá inclinação zero, e zero
  tem de significar ausência de peso de verdade (parede que não segura, corrente e piso
  de velocidade de volta). Quem responde por isso no laço é `comPeso`, o valor medido a
  cada quadro — não a chave.
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
- **dois cliques rápidos** ativam de verdade: os links de rede abrem normalmente (em
  aba nova, que é o `target="_blank"` do próprio HTML), e o Passatempo e o Mural abrem
  o **painel embutido** — `abrirPainel()`, em `js/fisica.js`, que acha o
  `#painel-<nome>` correspondente ao `data-abre` e lhe põe a classe `.aberto`. O espaço
  continua atrás e fechar devolve a pessoa exatamente onde ela estava;
- **arrastar** nunca ativa nada.

No caso do painel o `click` é disparado **antes** de ele abrir: se o seu script chamar
`preventDefault`, quem manda é ele e o painel não aparece.

> Já foi `window.open` com features de pop-up, para o Passatempo e o Mural virarem
> janela ao lado do portfólio. Saiu: o pop-up era bloqueado sem aviso em parte dos
> navegadores e, dentro do iframe de outra pessoa, `window.open` devolvia uma janela
> que nunca carregava nada — e, por não ser nula, o código dava a abertura por feita e
> nunca caía para o link. O painel embutido não tem nenhum desses dois modos de falhar.

Repare que **o seu script não precisa saber disso**. Todo clique simples é cancelado em
fase de captura; na ativação a física chama `el.click()`, que nasce com `detail === 0`
e por isso atravessa o próprio filtro. O que chega no seu listener é um `click` comum.

#### O segundo toque não é o `dblclick`

Quem decide que houve ativação é o **`pointerup`**, em `aoSoltar` — dois toques limpos
no mesmo objeto, dentro de 450ms. O `dblclick` só existe ali para ser cancelado.

Isso não é preferência: **no celular nada abria**, e por dois motivos somados.

O `dblclick` é um evento de mouse. O navegador até tenta sintetizá-lo no toque, mas com
`touch-action: none` e o `preventDefault` do `pointerdown` — os dois necessários para o
arrasto ser nosso — a maioria dos celulares não entrega nenhum. Sem `dblclick` não
existia segundo evento: o primeiro toque selecionava e acabava ali.

E o limiar de arrasto era 5px para todo mundo. **O dedo não pousa parado**: um toque que
a pessoa jura ter sido imóvel anda uns 10px enquanto a polpa se acomoda, e medido com a
régua do mouse ele virava arrasto — que é justamente o gesto que nunca ativa nada. Por
isso existem dois limiares, `LIMIAR_ARRASTO` para o cursor e `LIMIAR_DEDO` para o toque.

**Não há trava de distância entre um toque e o outro**, e isso é decisão. O objeto
deriva: com `VEL_DERIVA` em 105px/s, meio segundo leva a peça quase 50px para o lado, e
quem acompanha com o dedo toca em dois pontos diferentes da tela por causa do movimento,
não por engano. Qualquer raio que coubesse num toque parado recusaria o toque legítimo
num objeto rápido. Quem faz esse papel é melhor: os dois toques precisam cair no **mesmo
objeto** (cada corpo guarda o próprio último toque) e nenhum dos dois pode ter sido
arrasto.

#### A dica, e por que ela só existe no toque

No desktop o `title` de cada objeto conta que são dois cliques. **No toque não existe
tooltip**: quem toca uma vez vê a peça acender e mais nada acontecer, e conclui — com
razão — que a página quebrou. Então em `(hover: none)` aparece uma pílula fixa no rodapé,
"toque de novo para abrir", só depois do primeiro toque. Quem liga e desliga é a classe
`tem-selecao` no `<html>`, escrita pela mesma função `selecionar()`.

Se um dia o contrato virar toque único, é essa pílula que sai junto.

**A física não atrapalha esse clique.** Um toque sem arrasto dispara o `click`
normalmente; só o clique que nasce de um arrasto é cancelado — senão largar um card
em cima de outro lugar abriria o modal sem querer. O cancelamento usa um listener em
fase de captura registrado na carga da página, então ele roda antes do seu handler,
inclusive se o seu for delegado no `document`.

## Ícone solto vs. card

GitHub, Instagram, Behance, Kiwi, @imnotkiq, Movcode e Passatempo usam o
modificador `.orbe--nu`: mesmo esqueleto de três camadas, mas sem caixa e sem
texto — a placa de cor mora dentro do próprio SVG. Como não sobra texto visível, o
nome acessível vem do `aria-label` (e o `title` dá o tooltip que o rótulo dava
antes).

O `border-radius: 25%` da `.orbe--nu .orbe__face` não pinta nada: ele existe só
para o anel de seleção acompanhar o canto arredondado do ícone, e por isso repete
o mesmo `rx` que os SVGs usam. O Passatempo é a exceção deitada — o controle não é
quadrado, então o raio dele é fixo em px.

O Mural é o único card com rótulo, e ele é a mesma placa dos outros — um
retângulo de cor cheia, sem borda e sem textura. **A palavra é a peça**: nada de
ícone, legenda ou acessório, só "Mural" centrado e grande o bastante para ocupar
a largura dos dois quadrados, do mesmo jeito que os outros objetos são a marca
deles e nada mais.

Ele passou por dois estágios antes deste, e os dois foram embora pelo mesmo
motivo. Primeiro foi folha de fichário, com régua, margem, furos e papel torto:
do lado de sete placas retas, era a única peça que se explicava por textura em
vez de cor. Depois foi placa com percevejo e uma legenda embaixo — e os dois
acessórios diziam a mesma coisa que a palavra já dizia, roubando o espaço dela
numa peça que precisa do rótulo grande. O percevejo continua existindo, mas
dentro da página do Mural, nos recados; na capa, não.

**Movcode e Forlabs usam a marca de verdade**, de `img/movcode.svg` e
`img/forlabs.svg`, e cada uma chegou de um jeito:

- a da Movcode é **só a marca**, então ela entra vazada em branco sobre uma placa
  no laranja dela. A escala `0.7` no `<g>` é o mesmo respiro das outras placas:
  medida, a marca ocupa 776x1000 do viewBox e já nasce centrada em (500,500);
- a da Forlabs **já vem como tile** — quadrado de cantos arredondados, azul e
  branco, duas cores e nenhum degradê. Aí não há placa por baixo: o SVG é a peça
  inteira, exatamente como o esqueleto espera.

**O `--tom` de cada uma é a cor da marca**, e não uma da paleta: é ela que o anel
de foco e o de seleção assumem, então cada peça continua acendendo na própria cor.

**O @okaiquemota é uma câmera, e não a marca do Instagram**, de propósito: já
existe uma placa do Instagram na capa (o `@kiq.ham`), e duas iguais não diriam
qual leva a qual.

## O que ajustar

- **Links**: A Loja do Kiwi aponta para o site próprio (`lojadokiwi.com.br`), não
  mais para o Instagram da loja. Dois Instagram na capa: `@kiq.ham` (pessoal) e
  `@okaiquemota` (fotografia). GitHub e Behance ainda em `okaiquemota` — confirme
  o Behance.
- **Posições iniciais**: bloco *08* do CSS, junto com o `--tom` de cada peça.
  **Toda regra de posição declara `left` E `right`**, mesmo quando um dos dois é
  `auto` — veja abaixo por quê.
- **Cores**: a tabela acima. Trocar uma cor é trocar o token; nenhum valor de cor
  está escrito dentro de uma regra.
- **Passatempo**: o controle inteiro é o SVG do ícone; o bloco *7.1* só o dimensiona
  (é a única peça deitada — as outras são quadradas).
- **Mural**: placa lisa como as outras, e o rótulo é o desenho inteiro — no bloco
  *7.2*, que só dimensiona a peça e a palavra. Não há mais fichário, percevejo nem
  legenda ali; se for mexer, mexa no tamanho do `.orbe__rotulo`.

## Acessibilidade

- `:focus-visible` espelha o hover, então dá pra navegar tudo pelo teclado.
- **O nome e a linha de apoio não são selecionáveis.** `.nucleo` leva `user-select: none`
  e `-webkit-touch-callout: none`: ali é a marca no meio do vácuo, não texto para copiar,
  e no celular ela fica logo abaixo dos objetos que se arrasta — segurar um instante a
  mais acendia a alça de seleção e a lupa do sistema por cima da página.
- `prefers-reduced-motion: reduce` desliga animações e deriva, mantendo a interação.
- **Tinta escolhida à mão, não calculada.** Cada cartucho declara `--c` (a cor da
  placa) e `--t` (a tinta que vai por cima), e o `--t` está escrito no HTML em vez
  de sair de um `color-mix`: contraste sobre cor chapada é decisão de quem
  desenhou o card, e não conta que o navegador faça no escuro.

## As páginas internas e o `css/painel.css`

`jogos.html` e `mural.html` existem como página com endereço próprio **e** como
modal dentro da capa. A folha delas é `css/paginas.css`; a versão que vive dentro
do modal é `css/painel.css`, e essa é **gerada** — o `:root` e o `body` de
`paginas.css` pintariam a capa inteira ao abrir o painel, então cada seletor ganha
o escopo `.painel` e as três raízes viram o próprio `.painel`.

**Edite sempre `css/paginas.css`**, nunca `css/painel.css`. Depois:

```
node tools/gera-painel.mjs
```

### O conteúdo dos painéis é cópia, e não build

O `index.html` carrega dentro dos `.painel` o mesmo markup de `jogos.html` e
`mural.html`, **copiado à mão**. Só o CSS é gerado; para o HTML não existe
gerador nenhum, apesar de comentários antigos no código sugerirem que existia.

Então, ao mexer numa das páginas internas, **mexa nos dois lugares** e confira
que continuam iguais:

```sh
diff <(sed -n '/<section class="play"/,/^<\/section>/p' jogos.html) \
     <(sed -n '/<section class="play"/,/^<\/section>/p' index.html)
```

A única diferença legítima é a tinta dos cartuchos: a página pede `var(--ink)`,
que é o nome do token em `paginas.css`, e o painel pede `var(--tinta)`, que é o
nome dele na capa. São o mesmo `#111111`.

### O tremor do fim de partida mora na mensagem

Quem anima é `.msg.tremer`, e o seletor pede **as duas classes no mesmo
elemento**. Os seis jogos punham `tremer` no painel do jogo (`.game`), que nunca
casa com esse seletor — o tremor não acontecia em nenhum deles, sem erro no
console e sem nada na tela que denunciasse. Hoje quem põe a classe é a função
`tremer()`, uma só no topo de `js/jogos.js`, e ela mira no `elMsg` de cada jogo.

Se um dia o tremor tiver de sacudir o painel inteiro em vez da linha de recado, o
que muda é o seletor no CSS — não o alvo no JS, ou os seis voltam a divergir.

## A grade: um quadrado manda em todo mundo

Um número no `:root` decide o tamanho de todas as nove peças.

```
--quadrado   o lado das sete peças quadradas
--deitado    calc(var(--quadrado) * 2)   as duas deitadas
--canto      calc(var(--quadrado) * .25) o raio, igual para todas
```

As deitadas — o controle do Passatempo e o Mural — são **exatamente dois
quadrados lado a lado**: `--deitado` de largura por `--quadrado` de altura. O
viewBox do controle já é 160x80, então a proporção fecha sem esticar nada; o
Mural precisa da altura fixa na `.orbe__face`, senão a placa cresceria com o
texto e sairia da grade.

O `--canto` não pode ser porcentagem: 25% de uma caixa 2:1 sai elíptico. Em px
calculado, o canto do Mural e o do controle ficam idênticos ao dos quadrados —
que é o mesmo `rx="25%"` que os SVGs quadrados usam por dentro.

**Só o `--quadrado` muda por breakpoint.** Antes cada peça carregava o próprio
px em cada media query, e elas iam saindo de proporção uma da outra a cada tela
nova. Para mudar a escala inteira agora, muda-se um número.

## Passatempo e Mural estão fora da capa

Os dois objetos continuam no `index.html`, com um `hidden` no `<button>`. **Para
trazer de volta é apagar essa palavra** — nada mais foi removido: os painéis, os
seis jogos, o worker e as páginas `jogos.html` e `mural.html` seguem inteiros e
acessíveis pelo endereço próprio.

Duas coisas que isso exigiu, e que valem para qualquer peça que você queira
esconder no futuro:

**O `[hidden]` precisou de `!important` no reset.** O `display: none` do atributo
mora na folha do navegador, e folha de autor sempre ganha dela: bastava o
`.orbe { display: block }` que já existia para um `<button hidden>` continuar na
tela, focável e lido em voz alta. Sem essa linha o `hidden` não fazia nada — foi
exatamente o que aconteceu na primeira tentativa.

**A física ignora peça escondida.** Um elemento com `hidden` não tem caixa
nenhuma, e o laço mediria 0x0 nele — o que estraga a colisão das outras, que
passariam a bater num ponto sem tamanho no meio da tela. Com o filtro em
`js/fisica.js`, esconder um objeto da capa é uma coisa só: `hidden` no HTML.

## O recorde do chip é do aparelho, e o ranking devolve

`Placar.melhor()` lê o `localStorage`: o recorde do chip é do **navegador**, não
da pessoa. É de propósito — ele é instantâneo e funciona sem rede. Mas quem joga
no computador e depois abre no celular via o aparelho novo dizendo "seu recorde 0"
com o ranking logo abaixo mostrando o próprio nome com 65, e as duas linhas falam
da mesma pessoa e discordam.

Por isso o ranking **devolve o número para o aparelho**: em `herdarDoRanking()`,
se a lista traz o seu apelido com nota maior que a local, a local sobe. A escrita
vai direta no armazenamento e não por `Placar.guardar` — guardar levanta a
bandeira do confete, e herdar um número que você fez outro dia não é bater
recorde agora. O aparelho novo também herda de graça: abriu o jogo, já chega com
o seu número.

O preço é que dois visitantes com o mesmo apelido herdam um do outro. É a mesma
troca que o ranking por apelido já faz desde sempre.

O chip diz **"seu recorde"** por isso: para não competir com a lista logo abaixo,
que é de todo mundo.

## `left` e `right`, sempre os dois

Os breakpoints se empilham: num celular de 393px valem, ao mesmo tempo, o bloco de
1180px, o de 860px e o de 600px. Se um deles põe a peça na direita (`left: auto;
right: 6%`) e o seguinte só a devolve para a esquerda (`left: 5%`), o `right` do
anterior **fica**. E um elemento absoluto com `left` e `right` ao mesmo tempo e
largura automática não fica no meio: ele estica de uma borda à outra.

Foi o que aconteceu com o Movcode no celular — placa de 71px dentro de uma caixa
de 189px, com o anel de foco desenhado em volta da caixa inteira — e com o
Instagram no celular deitado, que já estava assim antes de o Movcode existir. Nada
disso aparece parado: só quando a peça está selecionada ou em foco, que é quando o
anel é pintado.

Por isso a regra virou: **toda linha de posição escreve os dois lados**. Custa uma
palavra e torna a classe de bug impossível.

## Os painéis são centralizados por `margin: auto`

`.painel` é flex e a folha leva `margin: auto`. A escolha é essa, e não um
`align-items: center` no pai, porque a folha pode ser mais alta que a tela: com
centralização pelo pai o topo sairia da área visível e **não haveria rolagem que
chegasse nele**. Com margem automática em item de flex, sobra vertical negativa faz
a margem valer zero por especificação — a folha encosta no topo e continua
alcançável. Testado a 380x380, onde a folha tem 517px.

## O carrossel e o `?v=`

Duas coisas que já quebraram a página e são fáceis de quebrar de novo.

**Quem rola é o `.trilho`, não a `.janela`.** O carrossel inteiro do
`js/jogos.js` — setas, bolinhas, teclado, arrasto com o mouse — está escrito em
cima de `trilho.scrollLeft` e `trilho.scrollTo()`. Sem `overflow-x` no `.trilho`
ele não é contêiner de rolagem: o `scrollLeft` fica preso em 0, nada anda, e não
há erro nenhum no console para avisar.

Na mesma linha, o estado da bolinha é o `aria-current` que o JS escreve — não uma
classe. Um estado só, que o leitor de tela e o CSS leem juntos; com dois, o visual
podia discordar do que era anunciado, e foi o que aconteceu.

**O `<kbd>G</kbd>` da chave de gravidade some em `(hover: none)`.** Onde não há
cursor também não há tecla: no celular a chave é o único jeito de ligar a
gravidade, e mostrar o atalho ao lado dela é instrução para um teclado que não
existe.

**Os `<link>` e `<script>` carregam com `?v=N`.** É um site estático em cache de
CDN: sem a versão na URL, o navegador de quem já visitou continua com o CSS antigo
e a página aparece meio nova e meio velha — ícone novo com tipografia velha, por
exemplo. Ao mexer em `css/` ou `js/`, **suba o número nos três HTML**.
