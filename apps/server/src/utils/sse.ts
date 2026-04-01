import type { ServerResponse } from 'http';

/**
 * Safely write an SSE event to a response stream.
 * Returns false if the stream is closed or the write fails.
 */
export function safeSSEWrite(raw: ServerResponse, data: object): boolean {
  try {
    if (raw.destroyed || raw.writableEnded) return false;
    raw.write(`data: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely end an SSE response stream.
 */
export function safeSSEEnd(raw: ServerResponse): void {
  try {
    if (!raw.destroyed && !raw.writableEnded) {
      raw.end();
    }
  } catch {
    // already closed
  }
}
