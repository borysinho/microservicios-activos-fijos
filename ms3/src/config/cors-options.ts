import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEFAULT_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'];
const DEFAULT_HEADERS = ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-Requested-With'];

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
}

export function buildCorsOptions(allowedOrigins: string[]): CorsOptions {
  const origins = allowedOrigins.map((origin) => origin.trim()).filter(Boolean);

  return {
    credentials: true,
    methods: DEFAULT_METHODS,
    allowedHeaders: DEFAULT_HEADERS,
    optionsSuccessStatus: 204,
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }

      const allowed = origins.some((origin) => {
        if (origin === '*') {
          return true;
        }

        if (origin.includes('*')) {
          return wildcardToRegExp(origin).test(requestOrigin);
        }

        return origin === requestOrigin;
      });

      callback(null, allowed);
    },
  };
}
