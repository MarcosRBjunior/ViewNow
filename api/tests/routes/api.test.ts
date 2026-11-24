import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/createApp.js';
import { AppError } from '../../src/errors/AppError.js';
import type { Video, VideosRepository } from '../../src/repositories/videos.repository.js';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';

const video = (n: number): Video => ({
  id: `6b1c3c1e-0000-4000-8000-00000000000${n}`,
  youtubeId: `video00000${n}`,
  playlistId: 'PLtest',
  title: `Vídeo ${n}`,
  description: `Descrição ${n}`,
  thumbnailUrl: `https://i.ytimg.com/vi/video00000${n}/hqdefault.jpg`,
  channelTitle: 'Canal',
  position: n,
  publishedAt: '2016-01-01T00:00:00+00:00',
});

function setup() {
  const repository = {
    listVisible: vi.fn().mockResolvedValue({ videos: [video(1), video(2)], total: 14 }),
    findVisible: vi.fn(async (id: string) =>
      id === 'video000001' || id === video(1).id ? video(1) : null,
    ),
    upsertMany: vi.fn(),
    removeMissing: vi.fn(),
    logSyncRun: vi.fn(),
    recordPlaybackReport: vi.fn().mockResolvedValue({ isNew: true, reporters: 1, hidden: false }),
    markUnplayable: vi.fn().mockResolvedValue(undefined),
    clearStaleUnplayable: vi.fn(),
    ping: vi.fn().mockResolvedValue(true),
  } satisfies VideosRepository;

  const runSync = vi
    .fn()
    .mockResolvedValue({ status: 'success', videosFetched: 20, removed: 1, durationMs: 1200 });

  const checkEmbed = vi.fn().mockResolvedValue('playable');

  const app = createApp({ repository, runSync, cronSecret: SECRET, checkEmbed });
  return { app, repository, runSync, checkEmbed };
}

let ctx: ReturnType<typeof setup>;

beforeEach(() => {
  ctx = setup();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/videos', () => {
  it('lista com paginação padrão e meta', async () => {
    const res = await request(ctx.app).get('/api/videos');

    expect(res.status).toBe(200);
    expect(ctx.repository.listVisible).toHaveBeenCalledWith({
      page: 1,
      limit: 12,
      search: undefined,
    });
    expect(res.body.meta).toEqual({ page: 1, limit: 12, total: 14, totalPages: 2 });
    expect(res.body.data).toHaveLength(2);
    expect(res.headers['cache-control']).toContain('s-maxage=60');
  });

  it('a listagem não inclui a descrição completa', async () => {
    const res = await request(ctx.app).get('/api/videos');
    expect(res.body.data[0]).toEqual({
      id: video(1).id,
      youtubeId: 'video000001',
      title: 'Vídeo 1',
      thumbnailUrl: video(1).thumbnailUrl,
      channelTitle: 'Canal',
      position: 1,
      publishedAt: video(1).publishedAt,
    });
  });

  it('repassa page, limit e search (com trim)', async () => {
    await request(ctx.app)
      .get('/api/videos')
      .query({ page: '2', limit: '5', search: '  opening ' });
    expect(ctx.repository.listVisible).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      search: 'opening',
    });
  });

  it('search vazio vira undefined', async () => {
    await request(ctx.app).get('/api/videos?search=%20%20');
    expect(ctx.repository.listVisible).toHaveBeenCalledWith({
      page: 1,
      limit: 12,
      search: undefined,
    });
  });

  it.each([
    ['limit acima de 50', { limit: '51' }],
    ['limit zero', { limit: '0' }],
    ['page negativa', { page: '-1' }],
    ['page não numérica', { page: 'abc' }],
    ['search longo demais', { search: 'x'.repeat(101) }],
  ])('400 para %s', async (_name, query) => {
    const res = await request(ctx.app).get('/api/videos').query(query);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(ctx.repository.listVisible).not.toHaveBeenCalled();
  });

  it('503 padronizado quando o banco falha', async () => {
    ctx.repository.listVisible.mockRejectedValueOnce(
      new AppError(503, 'DATABASE_ERROR', 'Falha ao acessar o banco de dados'),
    );
    const res = await request(ctx.app).get('/api/videos');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      error: { code: 'DATABASE_ERROR', message: 'Falha ao acessar o banco de dados' },
    });
  });

  it('500 sem vazar detalhes em erro inesperado', async () => {
    ctx.repository.listVisible.mockRejectedValueOnce(new Error('segredo interno'));
    const res = await request(ctx.app).get('/api/videos');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('segredo interno');
  });
});

describe('GET /api/videos/:id', () => {
  it('aceita youtube_id', async () => {
    const res = await request(ctx.app).get('/api/videos/video000001');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ youtubeId: 'video000001', description: 'Descrição 1' });
  });

  it('aceita uuid', async () => {
    const res = await request(ctx.app).get(`/api/videos/${video(1).id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(video(1).id);
  });

  it('404 para vídeo inexistente ou oculto', async () => {
    const res = await request(ctx.app).get('/api/videos/inexistente');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/videos/:id/embed', () => {
  it('devolve a URL do player com autoplay', async () => {
    const res = await request(ctx.app).get('/api/videos/video000001/embed');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      youtubeId: 'video000001',
      embedUrl: 'https://www.youtube.com/embed/video000001?autoplay=1',
    });
  });

  it('404 para vídeo inexistente', async () => {
    const res = await request(ctx.app).get('/api/videos/inexistente/embed');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/videos/:id/report', () => {
  const report = (id: string, body: object, ip = '203.0.113.7') =>
    request(ctx.app).post(`/api/videos/${id}/report`).set('X-Forwarded-For', ip).send(body);

  it('registra o relato com hash do IP, sem esconder quando o YouTube diz que toca', async () => {
    const res = await report('video000001', { code: 150 });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ data: { hidden: false } });
    expect(res.headers['cache-control']).toBe('no-store');
    const [youtubeId, hash, code] = ctx.repository.recordPlaybackReport.mock.calls[0]!;
    expect([youtubeId, code]).toEqual(['video000001', 150]);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('203.0.113.7');
    expect(ctx.checkEmbed).toHaveBeenCalledWith('video000001');
    expect(ctx.repository.markUnplayable).not.toHaveBeenCalled();
  });

  it('o mesmo IP gera o mesmo hash; IPs diferentes, hashes diferentes', async () => {
    await report('video000001', { code: 101 }, '198.51.100.1');
    await report('video000001', { code: 101 }, '198.51.100.1');
    await report('video000001', { code: 101 }, '198.51.100.2');
    const hashes = ctx.repository.recordPlaybackReport.mock.calls.map((call) => call[1]);
    expect(hashes[0]).toBe(hashes[1]);
    expect(hashes[0]).not.toBe(hashes[2]);
  });

  it('esconde na hora quando o oEmbed confirma o bloqueio', async () => {
    ctx.checkEmbed.mockResolvedValue('blocked');
    const res = await report('video000001', { code: 101 });

    expect(res.body).toEqual({ data: { hidden: true } });
    expect(ctx.repository.markUnplayable).toHaveBeenCalledWith('video000001');
  });

  it('não reconsulta o YouTube em relato repetido do mesmo visitante', async () => {
    ctx.repository.recordPlaybackReport.mockResolvedValue({
      isNew: false,
      reporters: 1,
      hidden: false,
    });
    await report('video000001', { code: 150 });
    expect(ctx.checkEmbed).not.toHaveBeenCalled();
  });

  it('não consulta o YouTube quando o banco já escondeu pelo limite de relatos', async () => {
    ctx.repository.recordPlaybackReport.mockResolvedValue({
      isNew: true,
      reporters: 3,
      hidden: true,
    });
    const res = await report('video000001', { code: 150 });
    expect(res.body).toEqual({ data: { hidden: true } });
    expect(ctx.checkEmbed).not.toHaveBeenCalled();
  });

  it('aceita o uuid interno e relata pelo youtube_id', async () => {
    await report(video(1).id, { code: 100 });
    expect(ctx.repository.recordPlaybackReport.mock.calls[0]![0]).toBe('video000001');
  });

  it.each([[{ code: 2 }], [{ code: '150' }], [{}], [{ code: 5 }]])(
    'rejeita código de erro inválido %j',
    async (body) => {
      const res = await report('video000001', body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(ctx.repository.recordPlaybackReport).not.toHaveBeenCalled();
    },
  );

  it('404 para vídeo inexistente ou já escondido, sem registrar nada', async () => {
    const res = await report('naoexiste01', { code: 150 });
    expect(res.status).toBe(404);
    expect(ctx.repository.recordPlaybackReport).not.toHaveBeenCalled();
  });
});

describe('rotas de sincronização', () => {
  it.each([
    ['sem header', undefined],
    ['secret errado', `Bearer ${SECRET}x`],
    ['sem o prefixo Bearer', SECRET],
  ])('POST /api/sync → 401 %s', async (_name, header) => {
    const req = request(ctx.app).post('/api/sync');
    const res = await (header ? req.set('Authorization', header) : req);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(ctx.runSync).not.toHaveBeenCalled();
  });

  it('POST /api/sync com secret dispara sync manual', async () => {
    const res = await request(ctx.app).post('/api/sync').set('Authorization', `Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'success', videosFetched: 20, removed: 1 });
    expect(ctx.runSync).toHaveBeenCalledWith('manual');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('GET /api/cron/sync com secret dispara sync do cron', async () => {
    const res = await request(ctx.app)
      .get('/api/cron/sync')
      .set('Authorization', `Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(ctx.runSync).toHaveBeenCalledWith('cron');
  });

  it('GET /api/cron/sync sem secret → 401', async () => {
    const res = await request(ctx.app).get('/api/cron/sync');
    expect(res.status).toBe(401);
  });

  it('erros da sync voltam no formato padrão', async () => {
    ctx.runSync.mockRejectedValueOnce(
      new AppError(409, 'SYNC_IN_PROGRESS', 'Já existe uma sincronização em andamento'),
    );
    const res = await request(ctx.app).post('/api/sync').set('Authorization', `Bearer ${SECRET}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SYNC_IN_PROGRESS');
  });
});

describe('GET /api/health', () => {
  it('ok quando o banco responde', async () => {
    const res = await request(ctx.app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' });
  });

  it('degraded quando o banco falha', async () => {
    ctx.repository.ping.mockResolvedValueOnce(false);
    const res = await request(ctx.app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', db: 'error' });
  });
});

describe('infra', () => {
  it('404 padronizado em rota inexistente', async () => {
    const res = await request(ctx.app).get('/api/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('CORS libera só a origem configurada', async () => {
    const allowed = await request(ctx.app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const blocked = await request(ctx.app)
      .get('/api/health')
      .set('Origin', 'https://site-malicioso.com');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('envia x-request-id e cabeçalhos de segurança', async () => {
    const res = await request(ctx.app).get('/api/health');
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
