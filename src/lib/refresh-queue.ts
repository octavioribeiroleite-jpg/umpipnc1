// Serialize reads and repeat when a change arrives during a request. An older
// response must never finish after a newer one and overwrite its snapshot.
export function createRefreshQueue(read: () => Promise<void>) {
  let running: Promise<void> | null = null;
  let again = false;
  let disposed = false;
  return {
    resume() { disposed = false; },
    request(): Promise<void> {
      if (disposed) return Promise.resolve();
      again = true;
      if (!running) {
        running = (async () => {
          try {
            while (again && !disposed) {
              again = false;
              await read();
            }
          } finally { running = null; }
        })();
      }
      return running;
    },
    dispose() { disposed = true; again = false; },
  };
}
