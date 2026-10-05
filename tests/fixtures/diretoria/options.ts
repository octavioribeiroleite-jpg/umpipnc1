// Captured once so in-app navigation does not change the selected fixture role.
const params = new URLSearchParams(location.search);
const roles = ['admin', 'pastor', 'diretoria', 'unauthorized', 'anonymous'] as const;
export type FixtureRole = typeof roles[number];
const requestedRole = params.get('role');
export const fixtureRole: FixtureRole = roles.includes(requestedRole as FixtureRole)
  ? requestedRole as FixtureRole : 'admin';
export const fixtureState = params.get('state') || 'normal';
export const fixtureDelay = Math.max(0, Math.min(10000, Number(params.get('delay')) || 0));
export const fixtureParams = params;
export const fixturePause = () => new Promise(resolve => setTimeout(resolve, fixtureDelay));
