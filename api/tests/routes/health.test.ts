import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

const limit = vi.fn();

vi.mock('../../src/lib/supabase.js', () => ({
  supabase: { from: () => ({ select: () => ({ limit }) }) },
}));

const { createApp } = await import('../../src/app.js');
const app = createApp();

describe('GET /api/health', () => {
  it('responde ok quando o banco responde', async () => {
    limit.mockResolvedValueOnce({ error: null });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' });
  });

  it('responde degraded quando o banco falha', async () => {
    limit.mockResolvedValueOnce({ error: { message: 'down' } });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', db: 'error' });
  });
});

describe('rotas inexistentes', () => {
  it('devolve 404 no formato padrão', async () => {
    const res = await request(app).get('/api/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
