import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';

export type MatchEventRow = Tables<'match_events'>;

type MatchEventInsert = TablesInsert<'match_events'>;
type MatchEventUpdate = TablesUpdate<'match_events'>;

/** List events for a match, ordered by minute then created_at. */
export async function listMatchEventsByMatchId(
    matchId: number,
): Promise<{ data: MatchEventRow[]; error: Error | null }> {
    const { data, error } = await supabase
        .from('match_events')
        .select()
        .eq('match_id', matchId)
        .order('minute', { ascending: true })
        .order('created_at', { ascending: true });
    return { data: data ?? [], error: error ?? null };
}

/** Create a match event. player_out_id required for SUB type. */
export async function createMatchEvent(
    payload: Pick<
        MatchEventInsert,
        'match_id' | 'minute' | 'player_id' | 'type'
    > & { player_out_id?: number | null },
): Promise<{ data: MatchEventRow | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('match_events')
        .insert(payload)
        .select()
        .single();
    return { data, error: error ?? null };
}

/** Update a match event. */
export async function updateMatchEvent(
    eventId: number,
    updates: Partial<Omit<MatchEventUpdate, 'id'>>,
): Promise<{ data: MatchEventRow | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('match_events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();
    return { data, error: error ?? null };
}

/** Delete a match event. */
export async function deleteMatchEvent(
    eventId: number,
): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('match_events')
        .delete()
        .eq('id', eventId);
    return { error: error ?? null };
}
