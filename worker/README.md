# A API (Cloudflare Worker)

Guarda o **ranking dos jogos** e o **mural de recados**. O site continua no
GitHub Pages e chama esta API de fora — por isso o CORS é explícito e a lista
de origens autorizadas fica na configuração.

Enquanto isso aqui não estiver publicado, o site funciona do mesmo jeito, só
que em **modo local**: cada visitante fica com o próprio recorde e o próprio
mural, no navegador dele.

## O que custa

Nada, no seu volume. O plano grátis do Workers dá **100.000 requisições por
dia** e o D1 dá **5 GB e 5 milhões de leituras/escritas por mês**. Uma página de
links pessoal não chega perto disso.

## Publicar (uma vez só)

Precisa de Node instalado. Tudo abaixo roda de dentro da pasta `worker/`.

```sh
cd worker
```

**1. Entrar na sua conta Cloudflare** (abre o navegador):

```sh
npx wrangler login
```

**2. Criar o banco:**

```sh
npx wrangler d1 create kiq
```

Ele imprime um bloco com `database_id`. Copie esse id e cole no
`wrangler.jsonc`, no lugar de `PREENCHER-COM-O-ID-QUE-O-WRANGLER-IMPRIMIR`.

**3. Criar as tabelas:**

```sh
npx wrangler d1 execute kiq --remote --file=./schema.sql
```

**4. Guardar os dois segredos.** Cada comando pede o valor e não deixa rastro
no repositório. Gere valores longos e aleatórios — por exemplo com
`node -e "console.log(crypto.randomUUID())"`:

```sh
npx wrangler secret put SAL
npx wrangler secret put SEGREDO_DONO
```

- `SAL` embaralha o endereço de quem escreve, para o banco nunca guardar IP em
  claro. Se você trocar depois, o limite de escrita simplesmente recomeça.
- `SEGREDO_DONO` é a sua chave para apagar recado do mural. **Guarde bem**, é
  ela que separa você de qualquer visitante.

**5. Publicar:**

```sh
npx wrangler deploy
```

No fim ele imprime o endereço, algo como
`https://kiq-api.SEU-SUBDOMINIO.workers.dev`.

**6. Ligar o site na API.** No `index.html`, na primeira linha do script:

```js
const API = 'https://kiq-api.SEU-SUBDOMINIO.workers.dev';
```

Commit, push, e o ranking e o mural viram coletivos. Nada mais muda.

## Apagar recado do mural

Abra o site **uma vez** com a chave na barra de endereço:

```
https://okaiquemota.github.io/kiq.portfolio/?dono=SEU_SEGREDO_DONO
```

A chave é guardada no seu navegador e sai da barra de endereço na hora. A
partir daí aparece um `×` em cada recado, só para você. Para esquecer a chave
(num computador emprestado, por exemplo), abra com `?dono=` vazio.

## Quando você comprar o domínio

Acrescente o endereço novo em `ORIGENS`, no `wrangler.jsonc`, separado por
vírgula, e publique de novo:

```jsonc
"vars": {
  "ORIGENS": "https://okaiquemota.github.io,https://kaiquemota.com.br"
}
```

```sh
npx wrangler deploy
```

O código não muda.

## Rodar os testes

```sh
node worker/teste.mjs
```

O D1 tem a mesma forma de `prepare().bind().first()/.all()/.run()` que o
`node:sqlite`, então um adaptador de vinte linhas roda **o Worker de verdade
contra SQLite de verdade** — as consultas SQL são exercitadas, não fingidas.

## O que a API faz e o que ela não faz

| Rota | O que faz |
| --- | --- |
| `GET /placar?jogo=genio` | os 10 melhores, uma linha por pessoa |
| `POST /placar` | grava uma pontuação |
| `GET /mural` | os 60 recados mais recentes |
| `POST /mural` | cola um recado |
| `DELETE /mural/:id` | tira um recado — só com `x-dono` |

Cuidados que estão dentro:

- **Origem conferida.** Quem não está em `ORIGENS` leva 403, inclusive no
  preflight.
- **Endereço nunca em claro.** O IP entra no banco como hash com sal.
- **Limite de escrita:** 8 por minuto por endereço, nas duas tabelas.
- **Pontuação implausível recusada:** acima do teto do jogo (60 no Gênio, 358
  na Cobrinha, que é o tabuleiro inteiro), ou quebrada, ou negativa.
- **Texto saneado:** caracteres de controle fora, corridas de espaço em branco
  juntadas (senão dá para colar 180 quebras de linha e esticar um post-it pela
  página toda), corte em 180 caracteres.
- **Mural não cresce sem fim:** fica nos 60 mais recentes.
- **Segredo comparado em tempo constante**, para não vazar pelo relógio.

E o que **não** está, de propósito:

- **Ranking sem login é falsificável.** O teto plausível corta o 999999
  preguiçoso, mas quem abre o console do navegador consegue mandar uma
  pontuação que nunca fez. Impedir isso de verdade exige conta e login. Para um
  passatempo de portfólio, normalmente se aceita.
- **Mural sem moderação prévia.** Recado aparece na hora, como você quis. O
  limite de escrita segura o spam automático, mas alguém decidido consegue
  deixar coisa feia no ar até você ver e apagar.
