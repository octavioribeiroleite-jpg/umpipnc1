// AbortSignal.timeout is unavailable in older mobile browsers. Keep the same
// request deadline using the broadly supported controller, and always release
// its timer when the read settles (including synchronous construction errors).
export async function withAuthReadDeadline<T>(read: (signal: AbortSignal) => PromiseLike<T>, timeoutMs = 5000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await read(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
