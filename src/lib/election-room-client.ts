import { supabase } from '@/integrations/supabase/client';

/** Room RPCs return validated JSON; do not let ungenerated database types erase
 * their runtime response while the matching migration is being deployed. */
export function electionRoomRpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> {
  const client = supabase as unknown as { rpc: (rpcName: string, rpcArgs: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };
  return client.rpc(name, args);
}
