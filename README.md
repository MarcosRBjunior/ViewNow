# ViewNow

Galeria de vídeos montada a partir de uma playlist do YouTube, para assistir sem sair do site.
Case full-stack com front e back desacoplados.

| Pasta | O que é | Stack |
| --- | --- | --- |
| [`api/`](./api) | API REST: sincroniza a playlist com o banco e serve os vídeos | Node 22 · Express 5 · TypeScript · Zod · Supabase |
| [`web/`](./web) | Front-end: galeria, playlist e player com autoplay | Next.js 16 (App Router) · React 19 · CSS Modules · react-youtube |
| [`supabase/`](./supabase) | Migrations SQL (schema, RLS, funções) | PostgreSQL |
| [`docs/`](./docs) | Especificação, arquitetura e system design | — |

> Status: **Etapa 5 — Player**. Veja o roadmap em [docs/specs.md](./docs/specs.md#9-marcos-roadmap).

## Como rodar localmente

Pré-requisitos: Node.js 22+, uma chave da YouTube Data API v3 e um projeto no Supabase.

```bash
# API (http://localhost:3333/api)
cd api
cp .env.example .env   # preencha as variáveis
npm install
npm run dev

# Web (http://localhost:3000) — em outro terminal
cd web
cp .env.example .env.local
npm install
npm run dev
```

Teste rápido: `curl http://localhost:3333/api/health`.

## Scripts

| Pasta | Comando | Descrição |
| --- | --- | --- |
| `api/` | `npm run dev` | Servidor com reload (`tsx watch`) |
| `api/` | `npm test` | Testes (Vitest + supertest) |
| `api/` | `npm run youtube:preview [-- 10]` | Lista no terminal os vídeos que a sync gravaria (precisa de `YOUTUBE_API_KEY`) |
| `api/` | `npm run sync` | Sincroniza a playlist com o banco (YouTube → `public.videos`, log em `internal.sync_runs`) |
| `api/` | `npm run db:types` | Regera `src/lib/database.types.ts` a partir do banco ligado |
| `api/` | `npm run lint` / `npm run typecheck` | Qualidade |
| `web/` | `npm run dev` / `npm run build` | Next.js |
| `web/` | `npm test` | Testes de componente (Vitest + React Testing Library) |
| `web/` | `npm run test:e2e` | Testes E2E no navegador (Playwright), com build de produção e API mock |
| `web/` | `npm run lint` / `npm run typecheck` | Qualidade |

## Testes

Três níveis, todos rodando no CI ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) a cada push e PR:

| Nível | Ferramenta | O que cobre | Onde roda no CI |
| --- | --- | --- | --- |
| Unitário e de rota (API) | Vitest + supertest | Mapeamento e filtros do YouTube, sync, repositório e as 6 rotas com o banco mockado | job `api` (`npm test` em `api/`) |
| Componente (web) | Vitest + React Testing Library | Cards, galeria e estados, paginação, busca com debounce, player (autoplay, próximo vídeo, aviso de bloqueio), lista da seleção, utilitários | job `web` (`npm test` em `web/`) |
| E2E (web) | Playwright (Chromium) | Galeria (destaque e grade, busca, busca vazia, paginação, API fora do ar, 390 px) e player (autoplay, próximo vídeo ao terminar, vídeo bloqueado, autoplay mudo, `/playlist`, 404, 390 px) | job `e2e` (`npm run test:e2e` em `web/`) |

O E2E não depende do Supabase nem da chave do YouTube: o Playwright sobe uma API mock ([`web/e2e/mock-api.mjs`](./web/e2e/mock-api.mjs)) com o mesmo contrato da API real e 20 vídeos fixos em [`web/e2e/fixtures/videos.json`](./web/e2e/fixtures/videos.json), faz o build de produção do Next apontando para ela e roda os testes em série. O YouTube também é simulado: o teste injeta uma IFrame Player API falsa no lugar de `youtube.com/iframe_api` ([`web/e2e/fake-youtube.ts`](./web/e2e/fake-youtube.ts)) e consegue disparar o fim do vídeo ou os erros 101/150 sem acessar a rede. Para simular a API fora do ar, o teste chama `POST /__e2e/state` no mock, que passa a responder 503.

```bash
cd web
npx playwright install chromium   # uma vez
npm run test:e2e                  # sobe mock + build + next start nas portas 3334 e 3201
```

## Rotas da API

Base: `/api`. Erros sempre no formato `{ "error": { "code", "message" } }`. Coleção pronta em [`api/requests.http`](./api/requests.http).

| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/videos?page&limit&search` | Lista paginada (limit 1–50, padrão 12), só vídeos visíveis, ordenada pela playlist | — |
| GET | `/videos/:id` | Um vídeo por uuid ou `youtube_id`; 404 se não existir ou estiver oculto | — |
| GET | `/videos/:id/embed` | `youtubeId` e `embedUrl` com `autoplay=1` | — |
| POST | `/sync` | Sincronização manual | `Bearer CRON_SECRET` |
| GET | `/cron/sync` | Sincronização diária (Vercel Cron, 06:00 UTC) | `Bearer CRON_SECRET` |
| GET | `/health` | Status da API e do banco | — |

## Documentação

- [Especificação](./docs/specs.md)
- [Arquitetura](./docs/architecture.md)
- [System design](./docs/system-design.md)

## Banco de dados (Supabase)

```bash
npx supabase login                      # uma vez, num terminal interativo
npx supabase link --project-ref <ref>   # liga a pasta supabase/ ao projeto
npx supabase db push --remote           # aplica as migrations de supabase/migrations
```

Segurança aplicada na migration inicial: RLS em todas as tabelas com políticas que negam `anon` e `authenticated`, log de sincronização no schema `internal` (fora da API pública) e função `log_sync_run` com `SECURITY DEFINER`, `search_path` fixo e execução restrita à `service_role`.
