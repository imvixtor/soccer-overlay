import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';

export type MatchConfigRow = Tables<'match_config'>;

type MatchConfigUpdate = TablesUpdate<'match_config'>;
type MatchConfigInsert = TablesInsert<'match_config'>;

/** Get match_config by user_id (one row per user). */
export async function getMatchConfig(
    userId: string,
): Promise<{ data: MatchConfigRow | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('match_config')
        .select()
        .eq('user_id', userId)
        .maybeSingle();
    return { data, error: error ?? null };
}

/** Update match_config by user_id. */
export async function updateMatchConfig(
    userId: string,
    updates: Partial<Omit<MatchConfigUpdate, 'user_id'>>,
): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('match_config')
        .update(updates)
        .eq('user_id', userId);
    return { error: error ?? null };
}

/** Upsert match_config (create if not exists). */
export async function upsertMatchConfig(
    userId: string,
    values: Partial<Omit<MatchConfigInsert, 'user_id'>>,
): Promise<{ data: MatchConfigRow | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('match_config')
        .upsert({ ...values, user_id: userId }, { onConflict: 'user_id' })
        .select()
        .single();
    return { data, error: error ?? null };
}
