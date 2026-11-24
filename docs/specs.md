# ViewNow — Especificação do Produto

> Galeria de vídeos montada a partir de uma playlist do YouTube, em que o usuário assiste aos vídeos sem sair do site.
> Projeto 10 do Portfólio Boost Program · nível básico · case full-stack.

| Item | Valor |
| --- | --- |
| Status | Em especificação (Etapa 0) |
| Repositório | `github.com/MarcosRBjunior/ViewNow` |
| Stack | TypeScript · Express (API) · Next.js 16 App Router (web) · PostgreSQL no Supabase · Vercel |
| Referência visual | Design "StreamVibe" (tema escuro, Manrope, acento vermelho) — arquivo local, não versionado |
| Playlist | `PLjNlQ2vXx1xbt30X8TcUfNzw_akVISXEu` |

Documentos relacionados: [architecture.md](./architecture.md) · [system-design.md](./system-design.md)

---

## 1. Objetivo

Entregar um case de portfólio full-stack que mostre:

1. Integração com API de terceiros (YouTube Data API v3) feita só no back-end.
2. Persistência em banco com segurança de verdade (RLS, chaves isoladas, schema interno).
3. Uma API REST desacoplada, consumida por um front em Next.js.
4. Uma interface com qualidade de produto (design de streaming escuro), com player embutido e autoplay.

## 2. Escopo

### 2.1 Níveis de entrega (do briefing)

| Nível | Entrega | Página |
| --- | --- | --- |
| 1 | Buscar a playlist e listar os vídeos, com link para cada um | `/` |
| 2 | Página que incorpora a playlist no player do YouTube | `/playlist` |
| 3 | Ao selecionar um vídeo, tocar embutido com autoplay na própria página | `/video/[youtubeId]` |

### 2.2 Dentro do escopo

- Sincronização da playlist → banco (manual e diária via Vercel Cron).
- Curadoria manual (`visible`) e limite de vídeos (`YOUTUBE_MAX_VIDEOS`, padrão 20).
- API REST com 6 rotas (seção 5).
- Galeria com busca por título, paginação, estados de carregamento/erro/vazio.
- Player com autoplay, próximo vídeo automático e aviso para vídeos que não tocam embutidos.
- Deploy na Vercel (2 projetos) e Supabase blindado.

### 2.3 Fora do escopo

- Login, cadastro, planos, assinatura e pagamento (telas *Subscriptions*, *Plans*, *CTA de free trial* do StreamVibe **não** serão implementadas).
- Formulário de suporte (tela *Support*), avaliações e reviews de usuários.
- Upload de vídeos, Storage e múltiplas playlists na interface (o modelo de dados já suporta, a UI não).
- Painel administrativo (curadoria é feita no Table Editor do Supabase).

## 3. Personas

| Persona | Necessidade |
| --- | --- |
| Visitante | Navegar pela galeria, buscar um vídeo e assistir sem sair do site |
| Recrutador / avaliador | Entender em minutos a arquitetura, as decisões e ver o produto funcionando (README + deploy) |
| Mantenedor (autor) | Sincronizar, esconder vídeos problemáticos e acompanhar falhas de sync |

## 4. Requisitos funcionais

### Back-end (`api/`)

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | Buscar os vídeos da playlist na YouTube Data API (`playlistItems.list`) | Respeita `YOUTUBE_MAX_VIDEOS`; pagina com `nextPageToken` só se o limite passar de 50 |
| RF-02 | Filtrar vídeos privados/excluídos, não incorporáveis e bloqueados no país do público | Descarta `privacyStatus != public`, `status.embeddable = false` e `contentDetails.regionRestriction` que bloqueia `YOUTUBE_REGION` (padrão `BR`), via `videos.list`, até 50 ids por chamada |
| RF-03 | Mapear para o modelo interno | `youtubeId, title, description, thumbnailUrl, channelTitle, position, publishedAt` (thumbnail `high` → fallback `medium` → `default`) |
| RF-04 | Persistir com upsert idempotente | Upsert por `youtube_id`; nunca sobrescreve `visible`; rodar 2x não duplica |
| RF-05 | Remover da seleção vídeos que saíram da playlist | Vídeos da mesma `playlist_id` ausentes no último fetch são apagados |
| RF-06 | Registrar cada execução de sync | Linha em `internal.sync_runs` com status, quantidade e erro |
| RF-07 | Listar vídeos | `GET /api/videos?page&limit&search`, só `visible = true`, ordenado por `position` |
| RF-08 | Buscar um vídeo | `GET /api/videos/:id` aceita uuid ou `youtube_id`; 404 se não existir ou estiver oculto |
| RF-09 | Dados de incorporação | `GET /api/videos/:id/embed` devolve `youtubeId` e `embedUrl` com `autoplay=1` |
| RF-10 | Disparar sync manual | `POST /api/sync` com `Authorization: Bearer <CRON_SECRET>`; 401 sem o header |
| RF-11 | Sync diária | `GET /api/cron/sync` chamado pela Vercel Cron às 06:00 UTC, mesmo header |
| RF-12 | Health check | `GET /api/health` informa status da API e do banco |
| RF-13 | Script local | `npm run sync` executa a mesma sincronização pelo terminal |

### Front-end (`web/`)

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-20 | Galeria na home (Nível 1) | Lista os vídeos vindos da API (nunca do YouTube direto), em grid responsivo de 1 a 5 colunas |
| RF-21 | Hero de destaque | Primeiro vídeo da seleção em destaque, com título, descrição e botão "Assistir agora" |
| RF-22 | Busca por título | Campo no header; debounce de 300 ms; termo refletido em `?search=` na URL |
| RF-23 | Paginação | Botão "Carregar mais" ou paginação numerada, usando `meta.total` |
| RF-24 | Estados | Skeleton (`loading.tsx`), erro com "Tentar de novo" (`error.tsx`), mensagem de lista vazia / busca sem resultado |
| RF-25 | Playlist incorporada (Nível 2) | `/playlist` toca a seleção via `embed/{primeiroId}?playlist={primeiroId},{id2},{id3},...` (o player usa a lista do parâmetro `playlist` inteira; sem o primeiro id ela começaria no segundo vídeo) |
| RF-26 | Página do vídeo (Nível 3) | `/video/[youtubeId]` toca com autoplay; URL compartilhável |
| RF-27 | Próximo vídeo | Ao terminar (`onEnd`), navega para o próximo da seleção |
| RF-28 | Vídeo bloqueado | Erros 101/150 do player mostram aviso com link "Assistir no YouTube" |
| RF-29 | Lista lateral | Na página do vídeo, a seleção aparece ao lado (abaixo no mobile) com o vídeo atual destacado |

## 5. Contrato resumido da API

| Método | Rota | Auth | Resposta |
| --- | --- | --- | --- |
| GET | `/api/videos` | — | `{ data: Video[], meta: { page, limit, total } }` |
| GET | `/api/videos/:id` | — | `{ data: VideoDetail }` |
| GET | `/api/videos/:id/embed` | — | `{ data: { youtubeId, embedUrl } }` |
| POST | `/api/sync` | Bearer `CRON_SECRET` | `{ data: { status, videosFetched, removed, durationMs } }` |
| GET | `/api/cron/sync` | Bearer `CRON_SECRET` | idem |
| GET | `/api/health` | — | `{ status: "ok" \| "degraded", db: "ok" \| "error", time }` |

Erro padrão em todas as rotas: `{ "error": { "code": "NOT_FOUND", "message": "..." } }`. Detalhes em [system-design.md](./system-design.md#4-contratos-da-api).

## 6. Requisitos não funcionais

| ID | Requisito | Meta |
| --- | --- | --- |
| RNF-01 | Segurança Supabase | Os 7 requisitos (RLS em tudo, secret key só no back, funções `SECURITY DEFINER` com `search_path` fixo, Auth blindado, Storage sem buckets, schema `internal`, Security Advisor sem avisos) |
| RNF-02 | Segredos | Nenhuma chave do Supabase ou do YouTube no `web/`; nada sensível com prefixo `NEXT_PUBLIC_`; `.env*` fora do git |
| RNF-03 | Desempenho | LCP < 2,5 s na home (Vercel, 4G); dados com `'use cache'` + `cacheLife` (5 min); `next/image` para miniaturas |
| RNF-04 | Cota do YouTube | Uma sync ≤ 5 unidades (cota padrão: 10.000/dia) |
| RNF-05 | Acessibilidade | WCAG 2.1 AA: contraste (paleta já validada), `alt` nas miniaturas, navegação por teclado, foco visível |
| RNF-06 | Responsividade | 360 px a 1920 px; tipografia com `clamp()` conforme o design |
| RNF-07 | Qualidade | ESLint + Prettier; testes unitários (mapeamento/filtros), de rota (supertest) e de componente (RTL); CI no GitHub Actions |
| RNF-08 | Disponibilidade | Falha do YouTube ou da sync nunca derruba a leitura: o site lê sempre do banco |
| RNF-09 | Autoria do repositório | Commits, PRs e arquivos versionados têm apenas o autor do projeto como autor/contribuidor. Nenhum trailer `Co-Authored-By`, rodapé "Generated with", menção a ferramentas de IA ou arquivos de configuração de assistentes entram no repositório |

## 7. Páginas e mapeamento do design (StreamVibe → ViewNow)

O StreamVibe é a referência visual. Só as telas que fazem sentido para uma galeria de vídeos são adaptadas:

| Tela/componente StreamVibe | Uso no ViewNow | Adaptação |
| --- | --- | --- |
| Header | Header global | Logo "ViewNow", menu `Início · Playlist`, ícone de busca que abre o campo |
| Home (hero) | `/` — hero | Destaque do 1º vídeo da seleção (miniatura `maxres/high` como key art) + "Assistir agora" |
| Movies & Shows (carrosséis, grades de 4/5 colunas, badges "Top 10") | `/` — galeria | Grid de cards; badge com a posição na playlist (`01`, `02`...) |
| Movie — Open (key art, Play Now, Description, Released Year, Genres) | `/video/[youtubeId]` | Key art vira o player 16:9; cards laterais: Descrição, Publicado em, Canal, Posição na playlist |
| Show — Open (Seasons and Episodes) | `/playlist` | Lista numerada no estilo "episódios" ao lado do player da playlist |
| Footer | Footer global | Simplificado: links internos, GitHub, créditos de dados (YouTube) |
| FAQ (accordion) | Opcional — seção "Sobre o projeto" | Perguntas sobre stack e decisões, útil para recrutadores |
| Subscriptions, Plans, CTA, Support, Stars/Reviews | — | Fora do escopo |

### 7.1 Tokens de design

**Cores** (tema escuro único)

| Token | Hex | Uso |
| --- | --- | --- |
| `--black-06` | `#0F0F0F` | Footer, inputs |
| `--black-08` | `#141414` | Fundo da página |
| `--black-10` | `#1A1A1A` | Cards e superfícies |
| `--black-12` | `#1F1F1F` | Bordas de menu, caixas numeradas |
| `--black-15` | `#262626` | Bordas e divisores |
| `--black-20` | `#333333` | Indicadores inativos |
| `--red-45` | `#E50000` | Botões primários, badges |
| `--red-55` | `#FF1919` | Hover do primário |
| `--white` | `#FFFFFF` | Títulos, texto principal, ícones |
| `--grey-75` | `#BFBFBF` | Itens inativos do menu |
| `--grey-60` | `#999999` | Parágrafos, labels, metadados |

Contrastes já validados: branco/Black 08 = 18,4:1 · Grey 60/Black 08 = 6,5:1 · branco/Red 45 = 4,8:1.

**Tipografia** — Manrope (via `next/font/google`), line-height 150%.

| Estilo | Tamanho responsivo | Peso | Uso |
| --- | --- | --- | --- |
| Display | `clamp(28px, 3.02vw, 58px)` | 700 | Hero |
| Heading 1 | `clamp(28px, 2.5vw, 48px)` | 700 | Título de página |
| Heading 2 | `clamp(24px, 1.98vw, 38px)` | 700 | Títulos de seção, título do vídeo |
| Heading 3 | `clamp(18px, 1.25vw, 24px)` | 600 | Títulos de card |
| Title | `clamp(16px, 1.04vw, 20px)` | 600 | Itens de lista, footer |
| Body L | `clamp(14px, 0.94vw, 18px)` | 400 | Parágrafos |
| Label/Button | `clamp(14px, 0.94vw, 18px)` | 600 | Botões, menu |
| Body S | `clamp(12px, 0.83vw, 16px)` | 500 | Metadados |
| Caption | `14px` | 500 | Badges |

**Layout** — container `max-width: 1596px`, padding lateral `clamp(16px, 5vw, 80px)`, gap de grade 30 px (20 px em cards internos), seções separadas por 150 px (home) / 120 px (internas).
**Raios** — 4 (badge) · 6 (chip) · 8 (botão/input) · 10 (thumb) · 12 (card/seção) · 51 (pill) · 50% (botão circular).
**Ícones** — traço 1,5 px, cantos arredondados, `currentColor`, 24–34 px.

## 8. Variáveis de ambiente

| Pasta | Variável | Exemplo | Sensível |
| --- | --- | --- | --- |
| `api/` | `YOUTUBE_API_KEY` | `AIza...` | Sim |
| `api/` | `YOUTUBE_PLAYLIST_ID` | `PLjNlQ2vXx1xbt30X8TcUfNzw_akVISXEu` | Não |
| `api/` | `YOUTUBE_MAX_VIDEOS` | `20` | Não |
| `api/` | `YOUTUBE_REGION` | `BR` (vazio desliga o filtro de país) | Não |
| `api/` | `SUPABASE_URL` | `https://xxx.supabase.co` | Não |
| `api/` | `SUPABASE_SECRET_KEY` | `sb_secret_...` | **Sim (máximo)** |
| `api/` | `CRON_SECRET` | texto aleatório ≥ 32 chars | Sim |
| `api/` | `CORS_ORIGIN` | `http://localhost:3000,https://viewnow.vercel.app` | Não |
| `api/` | `PORT` | `3333` (só local) | Não |
| `web/` | `NEXT_PUBLIC_API_URL` | `http://localhost:3333/api` | Não |
| `web/` | `NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID` | `PLjNlQ2vXx1xbt30X8TcUfNzw_akVISXEu` | Não |

## 9. Marcos (roadmap)

| Etapa | Entrega | Definição de pronto |
| --- | --- | --- |
| 0 — Setup | Monorepo `api/`, `web/`, `supabase/`; chaves criadas | "Hello world" nas duas pastas; chamada de teste ao YouTube OK |
| 1 — YouTube | `fetchPlaylistVideos` + testes | Até 20 vídeos públicos e incorporáveis, mapeados |
| 2 — Banco + segurança | Migration, RLS, `log_sync_run`, `npm run sync` | Sync idempotente; preserva `visible`; log em `internal.sync_runs` |
| 3 — API REST | 6 rotas, validação, erros, CORS, supertest | Todas as rotas testadas localmente |
| 4 — Galeria | Home com hero, grid, busca, estados | Nível 1 cumprido com o visual StreamVibe |
| 5 — Player | `/playlist` e `/video/[youtubeId]` | Níveis 2 e 3; próximo vídeo; aviso de bloqueio |
| 6 — Deploy | Supabase blindado, 2 projetos Vercel, cron, README com GIF | Security Advisor sem avisos; links públicos no README |

## 10. Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Vídeos de música com incorporação bloqueada | Player não toca | Filtro `embeddable`, coluna `visible`, aviso 101/150 com link externo |
| Cota do YouTube excedida | Sync falha | Sync custa ~2 unidades; site continua servindo do banco; erro registrado em `sync_runs` |
| Autoplay bloqueado pelo navegador | Vídeo não inicia | Inicia após clique do usuário; fallback `playVideo()` no `onReady` ou `mute: 1` |
| `react-youtube` sem manutenção ativa | Quebra futura | Componente isolado em `VideoPlayer`; fallback para `<iframe>` puro |
| Vazamento de `SUPABASE_SECRET_KEY` | Acesso total ao banco | Só em `api/.env` e variáveis da Vercel; nunca `NEXT_PUBLIC_`; secret scanning do GitHub ativo |
