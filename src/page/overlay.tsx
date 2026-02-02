import { useEffect, useState, useMemo } from 'react';
import { useLoaderData } from 'react-router';
import type { OverlayLoaderData } from '@/services/overlay.loader';
import { supabase } from '@/lib/supabase/client';
import {
    getTimeOffset,
    isClockStoppedPhase,
    formatMatchTimeSeconds,
} from '@/lib/match-constants';
import type { MatchPhase } from '@/lib/match-constants';
// @ts-expect-error - overlay components are JSX without types
import ScoreBug from '@/components/overlay/ScoreBug/ScoreBug';
// @ts-expect-error - overlay components are JSX without types
import MatchStatus from '@/components/overlay/MatchStatus/MatchStatus';
// @ts-expect-error - overlay components are JSX without types
import GlobalClock from '@/components/overlay/GlobalClock/GlobalClock';
import type { MatchWithTeams } from '@/services/matches.api';
import type { MatchEventRow } from '@/services/match-events.api';
import './overlay.css';

const DEFAULT_PHASE: MatchPhase = 'INITIATION';

const EVENT_TYPE_MAP: Record<string, string> = {
    GOAL: 'goal',
    YELLOW: 'yellow',
    RED: 'red',
    SUB: 'sub',
};

type PlayerForEvents = {
    number: number;
    full_name: string | null;
    nickname: string | null;
    team_id: number | null;
};

function transformEventsForMatchStatus(
    events: MatchEventRow[],
    playerById: Map<number, PlayerForEvents>,
    match: MatchWithTeams | null,
): {
    team: 'home' | 'away';
    shirtNumber: number;
    playerName: string;
    minute: number;
    type: string;
}[] {
    if (!match) return [];
    const homeTeamId = match.home_team;
    const awayTeamId = match.away_team;

    return events.map((ev) => {
        const p = playerById.get(ev.player_id);
        const team: 'home' | 'away' =
            p?.team_id === homeTeamId
                ? 'home'
                : p?.team_id === awayTeamId
                  ? 'away'
                  : 'home';
        const playerName = p
            ? p.nickname?.trim() || p.full_name?.trim() || ''
            : '';
        return {
            team,
            shirtNumber: p?.number ?? 0,
            playerName,
            minute: ev.minute,
            type: EVENT_TYPE_MAP[ev.type] ?? ev.type.toLowerCase(),
        };
    });
}

function LineupOverlay({
    match,
    players,
    isAway,
}: {
    match: MatchWithTeams | null;
    players: OverlayLoaderData['players'];
    isAway: boolean;
}) {
    const teamId = isAway ? match?.away_team : match?.home_team;
    const teamData = isAway ? match?.away_team_data : match?.home_team_data;
    const accentColor = isAway
        ? (match?.away_color ?? '#FF0000')
        : (match?.home_color ?? '#0000FF');

    const onFieldPlayers = useMemo(
        () =>
            players
                .filter((p) => p.team_id === teamId && p.is_on_field)
                .sort((a, b) => a.number - b.number),
        [players, teamId],
    );

    const teamName =
        teamData?.short_name ||
        teamData?.name ||
        (isAway ? 'Đội khách' : 'Đội nhà');

    return (
        <div
            className="overlay-lineup"
            style={{ '--team-accent': accentColor } as React.CSSProperties}
        >
            <div className="overlay-lineup-header">
                <span className="overlay-lineup-accent" />
                <span className="overlay-lineup-title">{teamName}</span>
            </div>
            <div className="overlay-lineup-list">
                {onFieldPlayers.map((p) => (
                    <div key={p.id} className="overlay-lineup-item">
                        <span className="overlay-lineup-number">
                            #{p.number}
                        </span>
                        <span className="overlay-lineup-name">
                            {p.nickname?.trim() || p.full_name?.trim() || '—'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function OverlayPage() {
    const initial = useLoaderData() as OverlayLoaderData;
    const [match, setMatch] = useState(initial.match);
    const [overlayControl, setOverlayControl] = useState(
        initial.overlayControl,
    );
    const [matchTime, setMatchTime] = useState('00:00');
    const [matchTimeSeconds, setMatchTimeSeconds] = useState(0);

    const phase = (match?.phase ?? DEFAULT_PHASE) as MatchPhase;
    const matchConfig = initial.matchConfig;
    const halfDuration = matchConfig?.half_duration ?? 45;
    const extraDuration = matchConfig?.extra_duration ?? 15;

    const playerById = useMemo(() => {
        const map = new Map<number, PlayerForEvents>();
        for (const p of initial.players) map.set(p.id, p);
        return map;
    }, [initial.players]);

    const matchStatusEvents = useMemo(
        () =>
            transformEventsForMatchStatus(
                initial.matchEvents,
                playerById,
                match,
            ),
        [initial.matchEvents, playerById, match],
    );

    // Realtime: match
    useEffect(() => {
        if (!match?.id) return;
        const channel = supabase
            .channel(`overlay-match:${match.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'matches',
                    filter: `id=eq.${match.id}`,
                },
                (payload) => {
                    setMatch((prev) =>
                        prev ? { ...prev, ...payload.new } : null,
                    );
                },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [match?.id]);

    // Realtime: overlay_control
    useEffect(() => {
        if (!initial.userId) return;
        const channel = supabase
            .channel(`overlay-control:${initial.userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'overlay_control',
                    filter: `user_id=eq.${initial.userId}`,
                },
                (payload) => {
                    setOverlayControl(
                        payload.new as OverlayLoaderData['overlayControl'],
                    );
                },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [initial.userId]);

    // Giá trị hiển thị khi đồng hồ dừng – tính từ match_time trong DB
    const stoppedPhaseTime =
        isClockStoppedPhase(phase) && match
            ? formatMatchTimeSeconds(match.match_time ?? 0)
            : null;

    // Giá trị khi chưa có start_at (chưa bắt đầu đếm)
    const noStartTime =
        !isClockStoppedPhase(phase) && !match?.start_at ? '00:00' : null;

    // Tính match time khi đồng hồ chạy (có start_at)
    useEffect(() => {
        if (isClockStoppedPhase(phase) || !match?.start_at) return;

        const timeOffset = getTimeOffset(phase, halfDuration, extraDuration);
        const start = new Date(match.start_at).getTime();

        if (!match.stop_at) {
            const updateTime = () => {
                const now = Date.now();
                const elapsed = Math.floor((now - start) / 1000);
                const totalSeconds = elapsed + timeOffset;
                setMatchTimeSeconds(totalSeconds);
                const minutes = Math.floor(totalSeconds / 60);
                const secs = totalSeconds % 60;
                setMatchTime(
                    `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
                );
            };
            updateTime();
            const interval = setInterval(updateTime, 1000);
            return () => clearInterval(interval);
        }
        const stop = new Date(match.stop_at).getTime();
        const elapsed = Math.floor((stop - start) / 1000);
        const totalSeconds = elapsed + timeOffset;
        setMatchTimeSeconds(totalSeconds);
        const minutes = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const formatted = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        queueMicrotask(() => setMatchTime(formatted));
    }, [match?.start_at, match?.stop_at, phase, halfDuration, extraDuration]);

    const displayMatchTime = stoppedPhaseTime ?? noStartTime ?? matchTime;

    /** Số giây tổng cho ScoreBug (logic thời gian bù nằm trong ScoreBug) */
    const scoreBugMatchTimeSeconds =
        isClockStoppedPhase(phase) && match
            ? (match.match_time ?? 0)
            : !match?.start_at && !isClockStoppedPhase(phase)
              ? 0
              : matchTimeSeconds;

    const ctrl = overlayControl ?? {
        clock_enable: true,
        scorebug_enable: true,
        match_status_enable: false,
        lineup_enable: false,
        away_lineup: false,
    };

    const homeName = match?.home_team_data?.name || 'Đội nhà';
    const awayName = match?.away_team_data?.name || 'Đội khách';
    const homeColor = match?.home_color ?? '#0000FF';
    const awayColor = match?.away_color ?? '#FF0000';
    const league = match?.name ?? 'Giao hữu';

    const periodLabel =
        phase === 'FIRST_HALF'
            ? 'HIỆP 1'
            : phase === 'HALFTIME'
              ? 'GIẢI LAO'
              : phase === 'SECOND_HALF'
                ? 'HIỆP 2'
                : phase === 'FULLTIME'
                  ? 'HẾT GIỜ'
                  : phase === 'EXTIME_FIRST_HALF'
                    ? 'HP 1'
                    : phase === 'EXTIME_HALF_TIME'
                      ? 'GL'
                      : phase === 'EXTIME_SECOND_HALF'
                        ? 'HP 2'
                        : phase === 'PENALTY_SHOOTOUT'
                          ? 'PENALTY'
                          : phase === 'POST_MATCH'
                            ? 'KẾT THÚC'
                            : phase;

    return (
        <div className="overlay-page">
            {ctrl.clock_enable && <GlobalClock />}

            {ctrl.scorebug_enable && (
                <ScoreBug
                    league={league}
                    homeTeam={homeName}
                    awayTeam={awayName}
                    homeScore={match?.home_score ?? 0}
                    awayScore={match?.away_score ?? 0}
                    matchTime={scoreBugMatchTimeSeconds}
                    phase={phase}
                    halfDuration={halfDuration}
                    extraDuration={extraDuration}
                    homeTeamAccentColor={homeColor}
                    awayTeamAccentColor={awayColor}
                />
            )}

            {ctrl.match_status_enable && (
                <MatchStatus
                    matchTime={displayMatchTime}
                    period={periodLabel}
                    league={league}
                    homeTeam={homeName}
                    awayTeam={awayName}
                    homeScore={match?.home_score ?? 0}
                    awayScore={match?.away_score ?? 0}
                    events={matchStatusEvents}
                    homeTeamAccentColor={homeColor}
                    awayTeamAccentColor={awayColor}
                />
            )}

            {ctrl.lineup_enable && (
                <LineupOverlay
                    match={match}
                    players={initial.players}
                    isAway={ctrl.away_lineup}
                />
            )}
        </div>
    );
}
