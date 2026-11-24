// API falsa para os testes E2E: mesmo contrato de GET /api/videos, /api/videos/:id,
// /api/videos/:id/embed e /api/health, servindo as fixtures de e2e/fixtures/videos.json.
// Sem banco e sem YouTube, então o resultado é sempre o mesmo, local ou no CI.
//
// Controle (só para os testes): POST /__e2e/state com {"down": true|false} faz todas
// as rotas /api/* responderem 503, simulando a API fora do ar. GET /__e2e/reports lista
// os ids relatados pelo player em POST /api/videos/:id/report.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const PORT = Number(process.env.E2E_API_PORT ?? 3334);
const videos = JSON.parse(readFileSync(new URL('./fixtures/videos.json', import.meta.url), 'utf8'))
  .filter((video) => video.visible !== false)
  .sort((a, b) => a.position - b.position);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let down = false;
const reports = [];

const toListItem = ({
  id,
  youtubeId,
  title,
  thumbnailUrl,
  channelTitle,
  position,
  publishedAt,
}) => ({
  id,
  youtubeId,
  title,
  thumbnailUrl,
  channelTitle,
  position,
  publishedAt,
});

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const error = (res, status, code, message) => send(res, status, { error: { code, message } });

function intParam(value, fallback, min, max) {
  if (value === null) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : NaN;
}

function listVideos(url, res) {
  const page = intParam(url.searchParams.get('page'), 1, 1, 1000);
  const limit = intParam(url.searchParams.get('limit'), 12, 1, 50);
  if (Number.isNaN(page) || Number.isNaN(limit)) {
    return error(res, 400, 'VALIDATION_ERROR', 'Parâmetros inválidos');
  }

  const search = url.searchParams.get('search')?.trim().toLowerCase();
  const matches = search ? videos.filter((v) => v.title.toLowerCase().includes(search)) : videos;
  const start = (page - 1) * limit;

  send(res, 200, {
    data: matches.slice(start, start + limit).map(toListItem),
    meta: { page, limit, total: matches.length, totalPages: Math.ceil(matches.length / limit) },
  });
}

function findVideo(id) {
  return videos.find((v) => (UUID.test(id) ? v.id === id : v.youtubeId === id));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (req.method === 'POST' && url.pathname === '/__e2e/state') {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      down = Boolean(JSON.parse(raw || '{}').down);
      send(res, 200, { down });
    });
    return;
  }

  // Relato do player (POST /api/videos/:id/report), chamado do navegador: precisa de CORS.
  if (url.pathname.match(/^\/api\/videos\/[^/]+\/report$/)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    if (req.method === 'OPTIONS') return void res.writeHead(204).end();
    if (req.method === 'POST') {
      req.resume();
      reports.push(decodeURIComponent(url.pathname.split('/')[3]));
      return send(res, 202, { data: { hidden: false } });
    }
  }
  if (url.pathname === '/__e2e/reports') return send(res, 200, { reports });

  if (down) return error(res, 503, 'SERVICE_UNAVAILABLE', 'API fora do ar (simulado)');
  if (req.method !== 'GET') return error(res, 404, 'NOT_FOUND', 'Rota não encontrada');

  if (url.pathname === '/api/health') {
    return send(res, 200, { status: 'ok', db: 'ok', time: new Date().toISOString() });
  }
  if (url.pathname === '/api/videos') return listVideos(url, res);

  const match = url.pathname.match(/^\/api\/videos\/([^/]+)(\/embed)?$/);
  if (match) {
    const video = findVideo(decodeURIComponent(match[1]));
    if (!video) return error(res, 404, 'NOT_FOUND', 'Vídeo não encontrado');
    if (match[2]) {
      const embedUrl = `https://www.youtube.com/embed/${video.youtubeId}?autoplay=1`;
      return send(res, 200, { data: { youtubeId: video.youtubeId, embedUrl } });
    }
    return send(res, 200, { data: video });
  }

  error(res, 404, 'NOT_FOUND', 'Rota não encontrada');
});

server.listen(PORT, () => console.log(`API mock (E2E) em http://localhost:${PORT}/api`));
