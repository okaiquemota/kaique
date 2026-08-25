# Portfólio — Kaique Mota

Carcaça visual do portfólio no conceito **Gravidade Zero** (spatial navigation / infinite canvas),
em dark mode. **HTML5 + CSS3 puro** — nenhuma biblioteca, nenhum JavaScript.

```
index.html
css/style.css
```

Abra o `index.html` direto no navegador. Não precisa de build.

## Como funciona a flutuação

Cada card é montado em duas camadas de propósito:

| Camada | Responsabilidade |
| --- | --- |
| `.orbe` | `position: absolute` + a animação de flutuar (`@keyframes`) |
| `.orbe__face` | o visual do card + a escala e o brilho do `:hover` (`transition`) |

Separar as camadas evita a briga clássica entre o `transform` do `@keyframes` e o `transform`
do hover — um sobrescreveria o outro se estivessem no mesmo elemento.

São 5 curvas diferentes (`flutuar-a` … `flutuar-e`), com durações de 5s a 9s e `animation-delay`
negativo em cada card, então nada entra em sincronia e o movimento não fica robótico.
A amplitude sai do token `--amp`, que os media queries reduzem no mobile — todo o sistema
encolhe junto sem reescrever keyframe nenhum.

No hover/foco o card usa `animation-play-state: paused` (trava no lugar), sobe de `z-index`,
cresce e acende o halo da sua cor (`--tom`).

## Plugando os modais

Os dois cards de modal já expõem os ganchos pedidos:

```html
<button class="orbe orbe--passatempo" data-abre="jogos"  aria-haspopup="dialog">…</button>
<button class="orbe orbe--mural"      data-abre="mural"  aria-haspopup="dialog">…</button>
```

São `<button>` (e não `<a href>`) justamente porque abrem um diálogo e não navegam.
O seu script pode escutar tudo de uma vez:

```js
document.querySelectorAll('[data-abre]').forEach(el => {
  el.addEventListener('click', () => abrirModal(el.dataset.abre)); // "jogos" | "mural"
});
```

## O que ajustar

- **Links**: `index.html` aponta para `github.com/okaiquemota`, `instagram.com/okaiquemota`
  e `behance.net/okaiquemota` — troque pelos perfis reais.
- **Posições**: cada card tem seu `top`/`left` no bloco *06. Posições & tempos* do CSS.
- **Cores**: os acentos ficam em `--ciano`, `--violeta`, `--rosa`, `--azul` no `:root`;
  cada card escolhe o seu com `--tom`.

## Detalhes de acessibilidade

- `:focus-visible` espelha o hover, então dá pra navegar tudo pelo teclado.
- `prefers-reduced-motion: reduce` desliga todas as animações e mantém a interação.
- Há fallback para navegadores sem `color-mix()`.
