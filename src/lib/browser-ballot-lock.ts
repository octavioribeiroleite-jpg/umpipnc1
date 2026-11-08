/** Serialize individual ballots across tabs in the same browser. The server
 * remains authoritative and checks the election/round/device before each vote.
 */
export async function withBrowserBallotLock<T>(name: string, work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(name, { mode: 'exclusive' }, work);
  }
  return work();
}
