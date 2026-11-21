# ViewNow

Galeria de vídeos montada a partir de uma playlist do YouTube, para assistir sem sair do site.
Case full-stack com front e back desacoplados.

| Pasta | O que é | Stack |
| --- | --- | --- |
| [`api/`](./api) | API REST: sincroniza a playlist com o banco e serve os vídeos | Node 22 · Express 5 · TypeScript · Zod · Supabase |
| [`web/`](./web) | Front-end: galeria, playlist e player com autoplay | Next.js 16 (App Router) · React 19 · CSS Modules · react-youtube |
| [`supabase/`](./supabase) | Migrations SQL (schema, RLS, funções) | PostgreSQL |
| [`docs/`](./docs) | Especificação, arquitetura e system design | — |

> Status: **Etapa 1 — integração com o YouTube**. Veja o roadmap em [docs/specs.md](./docs/specs.md#9-marcos-roadmap).

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
| `api/` | `npm run lint` / `npm run typecheck` | Qualidade |
| `web/` | `npm run dev` / `npm run build` | Next.js |
| `web/` | `npm run lint` / `npm run typecheck` | Qualidade |

## Documentação

- [Especificação](./docs/specs.md)
- [Arquitetura](./docs/architecture.md)
- [System design](./docs/system-design.md)
