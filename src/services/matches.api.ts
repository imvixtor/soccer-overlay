import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import type { MatchPhase } from '@/lib/match-constants';
import { shouldResetStartAt } from '@/lib/match-constants';
import { supabase } from '@/lib/supabase/client';

export type MatchRow = Tables<'matches'>;

export type MatchWithTeams = MatchRow & {
    home_team_data?: { name: string; short_name: string } | null;
    away_team_data?: { name: string; short_name: string } | null;
};

type MatchUpdateFields = TablesUpdate<'matches'>;
type MatchInsertFields = TablesInsert<'matches'>;

/** Get one match by user_id (single match per user). */
export async function getMatch(
    userId: string,
): Promise<{ data: MatchRow | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('matches')
        .select()
        .eq('user_id', userId)
        .maybeSingle();
    return { data, error: error ?? null };
}

/** Get match with team info (name, short_name) via relation. */
export async function getMatchWithTeams(
    userId: string,
): Promise<{ data: MatchWithTeams | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('matches')
        .select(
            `
            *,
            home_team_data:teams!matches_home_team_fkey(name, short_name),
            away_team_data:teams!matches_away_team_fkey(name, short_name)
        `,
        )
        .eq('user_id', userId)
        .maybeSingle();
    return { data: data as MatchWithTeams | null, error: error ?? null };
}

/** Create new match (phase INITIATION). Config (half_duration, etc.) comes from match_config. */
export async function createMatch(
    payload: Pick<MatchInsertFields, 'user_id' | 'home_team' | 'away_team' | 'name'>,
): Promise<{ data: MatchRow | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('matches')
        .insert({
            ...payload,
            phase: 'INITIATION' as const,
            home_score: 0,
            away_score: 0,
            penalty_home: 0,
            penalty_away: 0,
            match_time: 0,
        })
        .select()
        .single();
    return { data, error: error ?? null };
}

/** Update match fields (score, time, etc.). Not for phase changes. */
export async function updateMatch(
    matchId: number,
    updates: Partial<Omit<MatchUpdateFields, 'id'>>,
): Promise<{ data: MatchRow | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', matchId)
        .select()
        .single();
    return { data, error: error ?? null };
}

/** Update phase and start_at (reset clock when needed). */
export async function updateMatchPhase(
    matchId: number,
    nextPhase: MatchPhase,
): Promise<{ data: MatchRow | null; error: Error | null }> {
    const updates: Partial<MatchUpdateFields> = { phase: nextPhase };
    if (shouldResetStartAt(nextPhase)) {
        updates.start_at = new Date().toISOString();
    }
    if (nextPhase === 'POST_MATCH') {
        updates.stop_at = new Date().toISOString();
    }
    const { data, error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', matchId)
        .select()
        .single();
    return { data, error: error ?? null };
}

/** Reset match: phase INITIATION, score/penalty/start_at/stop_at to defaults. */
export async function resetMatch(
    matchId: number,
): Promise<{ data: MatchRow | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('matches')
        .update({
            phase: 'INITIATION',
            start_at: null,
            stop_at: null,
            home_score: 0,
            away_score: 0,
            penalty_home: 0,
            penalty_away: 0,
            match_time: 0,
        })
        .eq('id', matchId)
        .select()
        .single();
    return { data, error: error ?? null };
}
