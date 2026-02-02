import type { LoaderFunctionArgs } from 'react-router';
import { getMatchWithTeams } from './matches.api';
import { getMatchConfig } from './match-config.api';
import { supabase } from '@/lib/supabase/client';
import { getOverlayControl } from './control.api';
import { listMatchEventsByMatchId } from './match-events.api';

export interface OverlayLoaderData {
    userId: string;
    match: Awaited<ReturnType<typeof getMatchWithTeams>>['data'];
    matchConfig: Awaited<ReturnType<typeof getMatchConfig>>['data'];
    overlayControl: Awaited<ReturnType<typeof getOverlayControl>>['data'];
    teams: { id: number; name: string; short_name: string }[];
    players: {
        id: number;
        full_name: string | null;
        nickname: string | null;
        number: number;
        team_id: number | null;
        is_on_field: boolean;
    }[];
    matchEvents: Awaited<ReturnType<typeof listMatchEventsByMatchId>>['data'];
}

/** Loader cho trang overlay - truy cập công khai theo userId (không cần đăng nhập). */
export async function overlayLoader({
    params,
}: LoaderFunctionArgs): Promise<OverlayLoaderData | Response> {
    const userId = params.userId;
    if (!userId || typeof userId !== 'string') {
        return new Response('Thiếu ID người dùng', { status: 400 });
    }

    const [matchRes, configRes, overlayRes, teamsRes] = await Promise.all([
        getMatchWithTeams(userId),
        getMatchConfig(userId),
        getOverlayControl(userId),
        supabase
            .from('teams')
            .select('id, name, short_name')
            .eq('user_id', userId)
            .order('name'),
    ]);

    if (matchRes.error) throw matchRes.error;
    if (configRes.error) throw configRes.error;
    if (overlayRes.error) throw overlayRes.error;
    if (teamsRes.error) throw teamsRes.error;

    const match = matchRes.data;
    const matchConfig = configRes.data;
    const overlayControl = overlayRes.data;
    const teams = teamsRes.data ?? [];

    // Load players và match_events chỉ khi có match
    let players: OverlayLoaderData['players'] = [];
    let matchEvents: OverlayLoaderData['matchEvents'] = [];

    if (match?.id) {
        const [playersRes, eventsRes] = await Promise.all([
            supabase
                .from('players')
                .select('id, full_name, nickname, number, team_id, is_on_field')
                .eq('user_id', userId)
                .order('number', { ascending: true }),
            listMatchEventsByMatchId(match.id),
        ]);

        if (!playersRes.error) players = playersRes.data ?? [];
        if (!eventsRes.error) matchEvents = eventsRes.data ?? [];
    }

    return {
        userId,
        match,
        matchConfig,
        overlayControl,
        teams,
        players,
        matchEvents,
    };
}
