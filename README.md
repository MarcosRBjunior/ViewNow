# ViewNow

Galeria de vídeos montada a partir de uma playlist do YouTube, para assistir sem sair do site.
Case full-stack com front e back desacoplados.

| Pasta | O que é | Stack |
| --- | --- | --- |
| [`api/`](./api) | API REST: sincroniza a playlist com o banco e serve os vídeos | Node 22 · Express 5 · TypeScript · Zod · Supabase |
| [`web/`](./web) | Front-end: galeria, playlist e player com autoplay | Next.js 16 (App Router) · React 19 · CSS Modules · react-youtube |
| [`supabase/`](./supabase) | Migrations SQL (schema, RLS, funções) | PostgreSQL |
| [`docs/`](./docs) | Especificação, arquitetura e system design | — |

> Status: **Etapa 4 — Galeria**. Veja o roadmap em [docs/specs.md](./docs/specs.md#9-marcos-roadmap).

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
| `web/` | `npm run lint` / `npm run typecheck` | Qualidade |

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
