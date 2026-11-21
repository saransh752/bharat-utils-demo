import { isIP } from 'node:net';

type Input = Record<string, unknown>;
const limit = 10 * 1024;
const minute = 60_000;
const clients = new Map<string, number[]>();
let nextCleanup = 0;

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function throttle(request: Request) {
  // Vercel sets this header at its edge. Other deployments share one local bucket.
  const forwarded = request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim();
  const key = forwarded && isIP(forwarded) ? forwarded : 'local';
  const now = Date.now();
  if (now >= nextCleanup) {
    for (const [ip, timestamps] of clients) {
      if (timestamps[timestamps.length - 1] <= now - minute) clients.delete(ip);
    }
    nextCleanup = now + minute;
  }
  const recent = (clients.get(key) ?? []).filter((time) => time > now - minute);
  if (recent.length >= 30) throw new HttpError(429, 'Too many requests. Try again in a minute.');
  recent.push(now);
  clients.set(key, recent);
}

async function body(request: Request): Promise<Input> {
  if (Number(request.headers.get('content-length')) > limit) {
    throw new HttpError(413, 'Request body exceeds 10 KB.');
  }
  if (!request.body) throw new HttpError(400, 'Expected a JSON object.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let json = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        void reader.cancel().catch(() => {});
        throw new HttpError(413, 'Request body exceeds 10 KB.');
      }
      json += decoder.decode(value, { stream: true });
    }
    const parsed: unknown = JSON.parse(json + decoder.decode());
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed as Input;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Expected a JSON object.');
  } finally {
    reader.releaseLock();
  }
}

export const reply = (value: unknown, status = 200) => Response.json(value, {
  status,
  headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '60' } : {}) },
});

export function route(handler: (input: Input, request: Request) => unknown) {
  return async (request: Request) => {
    try {
      throttle(request);
      if (request.method === 'GET' && request.body) {
        throw new HttpError(400, 'GET does not accept a request body.');
      }
      const result = handler(request.method === 'GET' ? {} : await body(request), request);
      return result instanceof Response ? result : reply(result);
    } catch (error) {
      if (error instanceof HttpError) return reply({ error: error.message }, error.status);
      if (error instanceof TypeError || error instanceof RangeError ||
          (error instanceof Error && error.message.startsWith('Unknown type'))) {
        return reply({ error: 'Invalid input for this operation.' }, 400);
      }
      return reply({ error: 'The operation could not be completed.' }, 500);
    }
  };
}

function invalid(field: string): never {
  throw new HttpError(400, `Invalid ${field}.`);
}

export function string(value: unknown, field: string, max = 128, { empty = false, trim = true } = {}) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) invalid(field);
  return trim ? value.trim() : value;
}

export function number(value: unknown, field: string, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) invalid(field);
  return value;
}

export function boolean(value: unknown, field: string) {
  if (typeof value !== 'boolean') invalid(field);
  return value;
}

export function choice<T extends string>(value: unknown, field: string, options: readonly T[]): T {
  if (typeof value !== 'string' || !options.includes(value as T)) invalid(field);
  return value as T;
}

export function choices<T extends string>(value: unknown, field: string, options: readonly T[]) {
  if (!Array.isArray(value) || value.length > options.length) invalid(field);
  return [...new Set(value.map((item) => choice(item, field, options)))];
}
