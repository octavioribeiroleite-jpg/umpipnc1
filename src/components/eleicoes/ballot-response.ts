// Only the authoritative endpoint acknowledgement can display vote success.
// A transport success can still contain a rejected or malformed ballot response.
export function isBallotConfirmed(response: { data: unknown; error: unknown }): boolean {
  return response.error == null && typeof response.data === 'object' && response.data !== null
    && 'success' in response.data && response.data.success === true;
}
