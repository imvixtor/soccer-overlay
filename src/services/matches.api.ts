import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import {
    isHalfStartPhase,
    isHalfEndPhase,
    isClockRunningPhase,
    getTimeOffset,
} from '@/lib/match-constants';
import type { MatchPhase } from '@/lib/match-constants';
import { supabase } from '@/lib/supabase/client';
import { getMatchConfig } from './match-config.api';
import { resetAllPlayersToBench } from '@/services/players.api';
import { deleteMatchEventsByMatchId } from '@/services/match-events.api';

export type MatchRow = Tables<'matches'>;

export type MatchWithTeams = MatchRow & {
    home_team_data?: {
        name: string;
        short_name: string;
        coach?: string | null;
    } | null;
    away_team_data?: {
        name: string;
        short_name: string;
        coach?: string | null;
    } | null;
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
            home_team_data:teams!matches_home_team_fkey(name, short_name, coach),
            away_team_data:teams!matches_away_team_fkey(name, short_name, coach)
        `,
        )
        .eq('user_id', userId)
        .maybeSingle();
    return { data: data as MatchWithTeams | null, error: error ?? null };
}

/** Create new match (phase INITIATION). Config (half_duration, etc.) comes from match_config. */
export async function createMatch(
    payload: Pick<
        MatchInsertFields,
        | 'user_id'
        | 'home_team'
        | 'away_team'
        | 'name'
        | 'home_color'
        | 'away_color'
    >,
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

/** Update phase and start_at/stop_at (reset clock when needed). */
export async function updateMatchPhase(
    matchId: number,
    nextPhase: MatchPhase,
): Promise<{ data: MatchRow | null; error: Error | null }> {
    const updates: Partial<MatchUpdateFields> = { phase: nextPhase };
    const now = new Date().toISOString();
    const nowMs = Date.now();

    // Khi chuyển sang phase đồng hồ dừng: ghi nhận thời gian đang đếm vào match_time
    const isNextClockStopped =
        nextPhase === 'HALFTIME' ||
        nextPhase === 'FULLTIME' ||
        nextPhase === 'EXTIME_HALF_TIME' ||
        nextPhase === 'PENALTY_SHOOTOUT' ||
        nextPhase === 'POST_MATCH';

    if (isNextClockStopped) {
        const { data: currentMatch } = await supabase
            .from('matches')
            .select('phase, start_at, stop_at, user_id')
            .eq('id', matchId)
            .single();

        if (
            currentMatch &&
            isClockRunningPhase(currentMatch.phase as MatchPhase)
        ) {
            const { data: config } = await getMatchConfig(
                currentMatch.user_id as string,
            );
            const halfDuration = config?.half_duration ?? 45;
            const extraDuration = config?.extra_duration ?? 15;

            const refTimeMs =
                currentMatch.stop_at != null
                    ? new Date(currentMatch.stop_at).getTime()
                    : nowMs;
            const startMs = currentMatch.start_at
                ? new Date(currentMatch.start_at).getTime()
                : nowMs;
            const elapsedSeconds = Math.floor((refTimeMs - startMs) / 1000);
            const timeOffset = getTimeOffset(
                currentMatch.phase as MatchPhase,
                halfDuration,
                extraDuration,
            );
            updates.match_time = elapsedSeconds + timeOffset;
        }
    }

    // Khi bắt đầu hiệp đấu: đặt lại start_at là thời điểm bắt đầu, stop_at là null
    if (isHalfStartPhase(nextPhase)) {
        updates.start_at = now;
        updates.stop_at = null;
    }
    // Khi chuyển sang phase nghỉ: đặt stop_at là thời điểm kết thúc
    else if (isHalfEndPhase(nextPhase)) {
        updates.stop_at = now;
    }
    // Khi vào PENALTY_SHOOTOUT: dừng đồng hồ, ghi nhận thời gian
    else if (nextPhase === 'PENALTY_SHOOTOUT') {
        updates.stop_at = now;
    }
    // Khi kết thúc trận đấu: đặt stop_at
    else if (nextPhase === 'POST_MATCH') {
        updates.stop_at = now;
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

/**
 * Reset match + reset trạng thái cầu thủ về mặc định:
 * - tất cả cầu thủ: không ra sân, sẵn sàng dự bị
 */
export async function resetMatchWithPlayers(
    matchId: number,
    userId: string,
): Promise<{ data: MatchRow | null; error: Error | null }> {
    // Xoá toàn bộ event của trận trước khi reset
    const delEventsRes = await deleteMatchEventsByMatchId(matchId);
    if (delEventsRes.error) {
        return { data: null, error: delEventsRes.error };
    }

    const matchRes = await resetMatch(matchId);
    if (matchRes.error) return matchRes;

    try {
        await resetAllPlayersToBench(userId);
    } catch (e) {
        return {
            data: matchRes.data,
            error:
                e instanceof Error ? e : new Error('Failed to reset players'),
        };
    }

    return matchRes;
}
