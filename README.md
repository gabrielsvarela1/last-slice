# Pizzaria Sitiada

Serve pizzas de um lado e trava zombies do outro. As pizzas dão moedas, as moedas pagam as defesas.
Aos 3 minutos começa a morte súbita, com um Tetris no meio. Tem modo história (capítulo 1 com 8 fases), sobrevivência e multijogador online.

## Tecnologia

- **Jogo:** HTML, CSS e JavaScript com canvas (sem motor de jogo), empacotado com [Vite](https://vitejs.dev).
- **Servidor:** [Supabase](https://supabase.com)
  - **Auth anónima:** cada browser é um jogador convidado, sem registo.
  - **Postgres:** perfis, cosméticos, pontuações e ranking. Estrelas, compras e pontuações só mudam através de funções do servidor que as validam.
  - **Realtime (presença):** salas do multijogador.
- **Alojamento:** [Vercel](https://vercel.com), com publicação automática a cada push para `main`.

## Estrutura

```
index.html                 ecrãs e menus
src/main.js                o jogo (cozinha, esplanada, Tetris, menus, modo história, multijogador)
src/style.css              estilos
src/backend.js             sessão, perfil, estrelas, compras e ranking no Supabase
src/net.js                 salas multijogador sobre o Supabase Realtime
supabase/migrations/       esquema da base de dados e funções do servidor
```

## Correr localmente

```bash
npm install
cp .env.example .env.local   # preencher com o URL e a chave anon do projeto Supabase
npm run dev
```

Sem `.env.local` o jogo funciona na mesma, mas offline: o progresso fica só no browser e não há multijogador nem ranking.

Para testar a morte súbita sem esperar 5 minutos, abre o jogo com `?teste` no endereço (começa aos 15 segundos).

## Base de dados

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push        # aplica as migrações em supabase/migrations
npx supabase config push    # aplica as definições de auth (convidados anónimos)
```

Ao mudar preços ou acrescentar cosméticos em `src/main.js` (lista `CUSTOM`), cria uma migração nova que atualize a tabela `cosmetics`.
