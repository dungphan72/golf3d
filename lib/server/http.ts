import type { ServiceResult } from './common';

/** Maps a framework-agnostic service result to an HTTP response. */
export const sendResult = (r: ServiceResult) =>
  Response.json(r.body, {
    status: r.status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
export const httpError = (message: string, status = 400) =>
  sendResult({ status, body: { error: message } });
