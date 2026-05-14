import { randomBytes } from 'crypto';

import { logger } from '../logger';

const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'https:', 'wss:'],
  'media-src': ["'self'", 'https:', 'blob:'],
  'worker-src': ["'self'", 'blob:'],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
  'upgrade-insecure-requests': [],
};

export function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

export function buildCspHeader(nonce?: string): string {
  const directives = { ...CSP_DIRECTIVES };

  if (nonce) {
    directives['script-src'] = [
      "'self'",
      `'nonce-${nonce}'`,
      "'unsafe-eval'",
      "'strict-dynamic'",
    ];
    directives['style-src'] = ["'self'", `'nonce-${nonce}'`, "'unsafe-inline'"];

    logger.debug(`CSP nonce generated: ${nonce.substring(0, 8)}...`);
  }

  return Object.entries(directives)
    .map(([key, values]) =>
      values.length > 0 ? `${key} ${values.join(' ')}` : key,
    )
    .join('; ');
}

export const CSP_HEADER_VALUE = buildCspHeader();
