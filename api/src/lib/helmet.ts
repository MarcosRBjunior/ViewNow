import type { RequestHandler } from 'express';
import * as helmetModule from 'helmet';
import type { HelmetOptions } from 'helmet';

type Helmet = (options?: Readonly<HelmetOptions>) => RequestHandler;

/**
 * O helmet publica tipos ESM e CJS. O `tsc` do projeto (NodeNext) resolve o default
 * como função, mas o builder da Vercel resolve os tipos CJS, em que o import default
 * vira o namespace do módulo e o build falha ("not callable"). Pegando pelo namespace,
 * o mesmo código funciona nos dois casos, em tipo e em runtime.
 */
const resolved = (helmetModule as unknown as { default: Helmet | { default: Helmet } }).default;

export const helmet: Helmet = typeof resolved === 'function' ? resolved : resolved.default;
