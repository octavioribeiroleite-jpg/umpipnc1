import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import type { Actor } from './ai-auth-policy.ts';

type NamedProfile = { user_id: string; full_name: string | null };
export type MeetingAssigneeProfile = NamedProfile & { active: boolean; society_id: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uniqueIds = (values: readonly unknown[]) => [...new Set(values.filter((value): value is string => typeof value === 'string' && uuid.test(value)))];
const unavailable = () => new Error('Não foi possível confirmar os responsáveis da reunião.');

/** The caller must authenticate and authorize the meeting before using this
 * server client. Historic names belong to actual meeting participants/authors;
 * the model's assignment roster follows guard_task_relations' active scope.
 */
export async function loadMeetingAiProfiles(client: SupabaseClient, input: {
  actor: Actor; societyId: string | null; namedUserIds: readonly unknown[];
}): Promise<{ nameByUserId: Map<string, string | null>; assigneeProfiles: MeetingAssigneeProfile[] }> {
  const isAdmin = input.actor.roles.includes('admin');
  if (!isAdmin && (!input.actor.roles.includes('diretoria') || !input.societyId || input.actor.societyId !== input.societyId)) {
    throw new Error('Sem permissão para esta reunião.');
  }
  const namedIds = uniqueIds(input.namedUserIds);
  const names = namedIds.length
    ? client.from('profiles').select('user_id,full_name').in('user_id', namedIds)
    : Promise.resolve({ data: [] as NamedProfile[], error: null });
  const loadAssignees = async () => {
    const columns = 'user_id,full_name,active,society_id';
    if (isAdmin) {
      const result = await client.from('profiles').select(columns).eq('active', true);
      if (result.error) throw unavailable();
      return (result.data ?? []) as MeetingAssigneeProfile[];
    }
    // Administrators and pastors are valid assignees in every society. Read
    // only their IDs first, then names from the active allowed profile rows.
    const globalRoles = await client.from('user_roles').select('user_id').in('role', ['admin', 'pastor']);
    if (globalRoles.error) throw unavailable();
    const globalIds = uniqueIds((globalRoles.data ?? []).map(row => row.user_id));
    const [society, globals] = await Promise.all([
      client.from('profiles').select(columns).eq('active', true).eq('society_id', input.societyId),
      globalIds.length ? client.from('profiles').select(columns).eq('active', true).in('user_id', globalIds)
        : Promise.resolve({ data: [] as MeetingAssigneeProfile[], error: null }),
    ]);
    if (society.error || globals.error) throw unavailable();
    return [...(society.data ?? []), ...(globals.data ?? [])] as MeetingAssigneeProfile[];
  };
  const [historicNames, assignees] = await Promise.all([names, loadAssignees()]);
  if (historicNames.error) throw unavailable();
  const byId = new Map(assignees.filter(profile => profile.active && profile.full_name).map(profile => [profile.user_id, profile]));
  return {
    nameByUserId: new Map(((historicNames.data ?? []) as NamedProfile[]).map(profile => [profile.user_id, profile.full_name])),
    assigneeProfiles: [...byId.values()],
  };
}

/** Model output never creates authority to assign a foreign/inactive profile. */
export function resolveMeetingTaskAssigneeId(value: unknown, allowed: readonly MeetingAssigneeProfile[]): string | null {
  return typeof value === 'string' && uuid.test(value) && allowed.some(profile => profile.active && profile.user_id === value) ? value : null;
}
