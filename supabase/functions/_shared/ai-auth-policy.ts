/** Pure authorization predicates. Identity/roles/society MUST come from verified server queries,
 * never req.json(), localStorage, unsigned JWT decoding or user_metadata.
 * Caller must separately require a valid Supabase user and active application profile.
 */
export type Actor = { roles: string[]; societyId: string | null };

export function canSummarizeStudy(actor: Actor, studySocietyId: string | null): boolean {
  return actor.roles.includes("admin") || (actor.roles.includes("diretoria") &&
    !!actor.societyId && !!studySocietyId && actor.societyId === studySocietyId);
}

/** Suggested paid-report policy: same managers as writes; pastor additionally permitted to read.
 * Explicitly narrower than all study_notes SELECT readers. Confirm business policy before rollout.
 */
export function canSummarizeYear(actor: Actor, societyId: string): boolean {
  return actor.roles.includes("pastor") || canSummarizeStudy(actor, societyId);
}

/** Secretary view is accessible to management/pastor. No member-PIN or EBD session allowance. */
export function canGenerateBirthdayAnnouncement(actor: Actor): boolean {
  return actor.roles.some(role => ["admin", "diretoria", "pastor"].includes(role));
}
