import { useEffect, useState, useMemo } from 'react';
import { useLoaderData } from 'react-router';
import type { OverlayLoaderData } from '@/services/overlay.loader';
import { supabase } from '@/lib/supabase/client';
import {
    getTimeOffset,
    isClockStoppedPhase,
    formatMatchTimeSeconds,
    EVENT_TYPE_LABELS,
} from '@/lib/match-constants';
import type { MatchPhase } from '@/lib/match-constants';
// @ts-expect-error - overlay components are JSX without types
import ScoreBug from '@/components/overlay/ScoreBug/ScoreBug';
// @ts-expect-error - overlay components are JSX without types
import MatchStatus from '@/components/overlay/MatchStatus/MatchStatus';
// @ts-expect-error - overlay components are JSX without types
import GlobalClock from '@/components/overlay/GlobalClock/GlobalClock';
// @ts-expect-error - overlay components are JSX without types
import EventToast from '@/components/overlay/EventToast/EventToast';
// @ts-expect-error - overlay components are JSX without types
import Lineup from '@/components/overlay/Lineup/Lineup';
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

const TOAST_DURATION_MS = 10000;

export type ToastItem = {
    id: number;
    type: string;
    message: string;
};

function eventToToastItem(
    ev: MatchEventRow,
    playerById: Map<number, PlayerForEvents>,
): ToastItem {
    const p = playerById.get(ev.player_id);
    const pOut = ev.player_out_id ? playerById.get(ev.player_out_id) : null;
    const typeLabel =
        EVENT_TYPE_LABELS[ev.type as keyof typeof EVENT_TYPE_LABELS] ?? ev.type;
    const playerLabel = p
        ? `#${p.number} ${p.nickname?.trim() || p.full_name?.trim() || ''}`
        : `#${ev.player_id}`;
    const playerOutLabel = pOut
        ? `#${pOut.number} ${pOut.nickname?.trim() || pOut.full_name?.trim() || ''}`
        : null;
    const message =
        ev.type === 'SUB' && playerOutLabel
            ? `${ev.minute}' ${playerOutLabel} ra, ${playerLabel} vào`
            : `${ev.minute}' ${playerLabel}`;
    return { id: ev.id, type: typeLabel, message };
}

export type MatchStatusEvent = {
    id: number;
    team: 'home' | 'away';
    shirtNumber: number;
    playerName: string;
    minute: number;
    type: string;
};

function transformEventsForMatchStatus(
    events: MatchEventRow[],
    playerById: Map<number, PlayerForEvents>,
    match: MatchWithTeams | null,
): MatchStatusEvent[] {
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
            id: ev.id,
            team,
            shirtNumber: p?.number ?? 0,
            playerName,
            minute: ev.minute,
            type: EVENT_TYPE_MAP[ev.type] ?? ev.type.toLowerCase(),
        };
    });
}

export default function OverlayPage() {
    const initial = useLoaderData() as OverlayLoaderData;
    const [match, setMatch] = useState(initial.match);
    const [overlayControl, setOverlayControl] = useState(
        initial.overlayControl,
    );
    const [matchConfig, setMatchConfig] = useState(initial.matchConfig);
    const [matchTime, setMatchTime] = useState('00:00');
    const [matchTimeSeconds, setMatchTimeSeconds] = useState(0);
    const [matchEvents, setMatchEvents] = useState<MatchEventRow[]>(
        initial.matchEvents ?? [],
    );
    const [players, setPlayers] = useState(initial.players);
    const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);

    const phase = (match?.phase ?? DEFAULT_PHASE) as MatchPhase;
    const halfDuration = matchConfig?.half_duration ?? 45;
    const extraDuration = matchConfig?.extra_duration ?? 15;

    const playerById = useMemo(() => {
        const map = new Map<number, PlayerForEvents>();
        for (const p of players) map.set(p.id, p);
        return map;
    }, [players]);

    const matchStatusEvents = useMemo(
        () => transformEventsForMatchStatus(matchEvents, playerById, match),
        [matchEvents, playerById, match],
    );

    // Khi không có match: xóa dữ liệu để tránh hiển thị stale
    useEffect(() => {
        if (match?.id) return;
        queueMicrotask(() => {
            setMatchEvents([]);
            setToastQueue([]);
            setPlayers([]);
        });
    }, [match?.id]);

    // Realtime: players
    useEffect(() => {
        if (!initial.userId) return;

        const channel = supabase
            .channel(`overlay-players:${initial.userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'players',
                    filter: `user_id=eq.${initial.userId}`,
                },
                async () => {
                    // Reload players khi có thay đổi
                    const { data } = await supabase
                        .from('players')
                        .select(
                            'id, full_name, nickname, number, team_id, is_on_field',
                        )
                        .eq('user_id', initial.userId)
                        .order('number', { ascending: true });
                    if (data) setPlayers(data);
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [initial.userId]);

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
                    const updated = payload.new as Record<string, unknown>;
                    setMatch((prev) => (prev ? { ...prev, ...updated } : null));
                    // Phát hiện reset: phase INITIATION + tỉ số 0 → xóa events và toast
                    if (
                        updated?.phase === 'INITIATION' &&
                        (updated?.home_score ?? 0) === 0 &&
                        (updated?.away_score ?? 0) === 0 &&
                        (updated?.penalty_home ?? 0) === 0 &&
                        (updated?.penalty_away ?? 0) === 0
                    ) {
                        setMatchEvents([]);
                        setToastQueue([]);
                    }
                },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [match?.id]);

    // Realtime: match_events
    useEffect(() => {
        if (!match?.id) return;

        const channel = supabase
            .channel(`overlay-match-events:${match.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'match_events',
                    filter: `match_id=eq.${match.id}`,
                },
                (payload) => {
                    const newRow = payload.new as MatchEventRow;
                    setMatchEvents((prev) => {
                        if (prev.some((e) => e.id === newRow.id)) return prev;
                        const next = [...prev, newRow].sort(
                            (a, b) =>
                                a.minute - b.minute ||
                                new Date(a.created_at || 0).getTime() -
                                    new Date(b.created_at || 0).getTime(),
                        );
                        return next;
                    });
                    const toastItem = eventToToastItem(newRow, playerById);
                    setToastQueue((prev) => [...prev, toastItem]);
                },
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'match_events',
                    filter: `match_id=eq.${match.id}`,
                },
                (payload) => {
                    const oldRow = payload.old as { id?: number } | null;
                    if (oldRow?.id != null)
                        setMatchEvents((prev) =>
                            prev.filter((e) => e.id !== oldRow.id),
                        );
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [match?.id, playerById]);

    // Hàng chờ EventToast: hiển thị 6s mỗi sự kiện, xong mới hiện sự kiện tiếp
    const currentToast = toastQueue[0] ?? null;
    useEffect(() => {
        if (!currentToast) return;
        const timer = window.setTimeout(() => {
            setToastQueue((prev) => prev.slice(1));
        }, TOAST_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [currentToast]);

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
                    if (payload.new)
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

    // Realtime: match_config (đồng bộ thời lượng hiệp, hiệp phụ, penalty...)
    useEffect(() => {
        if (!initial.userId) return;

        const channel = supabase
            .channel(`overlay-match-config:${initial.userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'match_config',
                    filter: `user_id=eq.${initial.userId}`,
                },
                (payload) => {
                    if (payload.new) {
                        setMatchConfig(
                            payload.new as OverlayLoaderData['matchConfig'],
                        );
                    }
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
                const totalSeconds = Math.max(0, elapsed + timeOffset);
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
        const totalSeconds = Math.max(0, elapsed + timeOffset);
        const minutes = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const formatted = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        queueMicrotask(() => {
            setMatchTimeSeconds(totalSeconds);
            setMatchTime(formatted);
        });
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
              ? 'hẾT HIỆP 1'
              : phase === 'SECOND_HALF'
                ? 'HIỆP 2'
                : phase === 'FULLTIME'
                  ? 'HẾT GIỜ'
                  : phase === 'EXTIME_FIRST_HALF'
                    ? 'HIỆP PHỤ 1'
                    : phase === 'EXTIME_HALF_TIME'
                      ? 'NGHỈ HIỆP PHỤ'
                      : phase === 'EXTIME_SECOND_HALF'
                        ? 'HIỆP PHỤ 2'
                        : phase === 'PENALTY_SHOOTOUT'
                          ? 'PENALTY'
                          : phase === 'POST_MATCH'
                            ? 'KẾT THÚC'
                            : phase === 'INITIATION'
                              ? 'SẮP BẮT ĐẦU'
                              : phase === 'PREPARATION'
                                ? 'CHUẨN BỊ'
                                : phase === 'PRE_MATCH'
                                  ? 'TRƯỚC TRẬN'
                                  : phase;

    return (
        <div className="overlay-page">
            {ctrl.clock_enable && <GlobalClock />}

            {currentToast && (
                <EventToast
                    key={currentToast.id}
                    type={currentToast.type}
                    message={currentToast.message}
                />
            )}

            {ctrl.scorebug_enable && (
                <ScoreBug
                    league={league}
                    homeTeam={homeName}
                    awayTeam={awayName}
                    homeScore={match?.home_score ?? 0}
                    awayScore={match?.away_score ?? 0}
                    penaltyHome={match?.penalty_home ?? 0}
                    penaltyAway={match?.penalty_away ?? 0}
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
                    showMatchTime={phase !== 'POST_MATCH'}
                    period={periodLabel}
                    league={league}
                    homeTeam={homeName}
                    awayTeam={awayName}
                    homeScore={match?.home_score ?? 0}
                    awayScore={match?.away_score ?? 0}
                    penaltyHome={match?.penalty_home ?? 0}
                    penaltyAway={match?.penalty_away ?? 0}
                    events={matchStatusEvents}
                    homeTeamAccentColor={homeColor}
                    awayTeamAccentColor={awayColor}
                />
            )}

            {ctrl.lineup_enable && (
                <Lineup
                    match={match}
                    players={players}
                    teams={initial.teams}
                    isAway={ctrl.away_lineup}
                />
            )}
        </div>
    );
}
