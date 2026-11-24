import type { NextConfig } from 'next';

// Origem da API: o player relata direto do navegador os vídeos que não tocam.
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api').origin;

// CSP: só o próprio site, a API, as miniaturas do i.ytimg.com e o player do YouTube.
// 'unsafe-inline' em scripts é necessário porque as páginas usam Partial Prerender
// (shell estático): nonce por request tornaria todas as páginas dinâmicas.
// Em `next dev` a CSP fica desligada (o React precisa de eval para o overlay de erros).
const contentSecurityPolicy = [
  "default-src 'self'",
  // Hosts sem esquema herdam o da página: em produção (HTTPS) só aceitam HTTPS; em
  // `next start` local (HTTP) o react-youtube carrega a IFrame API por http://.
  "script-src 'self' 'unsafe-inline' www.youtube.com s.ytimg.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://i.ytimg.com",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin}`,
  'frame-src www.youtube.com www.youtube-nocookie.com',
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }]
    : []),
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  agentRules: false,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' }],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
