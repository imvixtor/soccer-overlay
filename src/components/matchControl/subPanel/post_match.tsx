import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { MatchWithTeams } from '@/services/matches.api';
import { supabase } from '@/lib/supabase/client';
import { EVENT_TYPE_LABELS, type EventType } from '@/lib/match-constants';
import { formatPlayerLabel } from '@/lib/format';

type PlayerLite = {
    id: number;
    full_name: string | null;
    nickname: string | null;
    number: number;
    team_id: number | null;
};

type MatchEventDetailed = {
    id: number;
    created_at: string;
    match_id: number;
    minute: number;
    bonus_minute: number | null;
    player_id: number;
    player_out_id: number | null;
    type: EventType;
    players: PlayerLite | null;
    player_out: PlayerLite | null;
};

function formatEventMinute(ev: Pick<MatchEventDetailed, 'minute' | 'bonus_minute'>) {
    const base = ev.minute;
    const bonus = ev.bonus_minute ?? 0;
    if (bonus > 0) return `${base}+${bonus}`;
    return `${base}`;
}

function playerLabel(p: PlayerLite | null) {
    return formatPlayerLabel(p, 'Unknown player');
}

interface MatchStatsProps {
    match: MatchWithTeams | null;
}

export function MatchStats({ match }: MatchStatsProps) {
    const homeName =
        match?.home_team_data?.short_name ||
        match?.home_team_data?.name ||
        'Đội nhà';
    const awayName =
        match?.away_team_data?.short_name ||
        match?.away_team_data?.name ||
        'Đội khách';
    const homeColor = match?.home_color ?? null;
    const awayColor = match?.away_color ?? null;

    const [events, setEvents] = useState<MatchEventDetailed[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [eventsError, setEventsError] = useState<string | null>(null);

    const matchId = match?.id ?? null;

    const teamById = useMemo(() => {
        const homeId = match?.home_team ?? null;
        const awayId = match?.away_team ?? null;
        return { homeId, awayId };
    }, [match?.home_team, match?.away_team]);

    const loadEvents = useCallback(async () => {
        if (!matchId) {
            setEvents([]);
            return;
        }
        setIsLoadingEvents(true);
        setEventsError(null);
        try {
            const res = await supabase
                .from('match_events')
                .select(
                    `
                    id, created_at, match_id, minute, bonus_minute, player_id, player_out_id, type,
                    players:players!match_events_player_id_fkey(id, full_name, nickname, number, team_id),
                    player_out:players!match_events_player_out_id_fkey(id, full_name, nickname, number, team_id)
                `,
                )
                .eq('match_id', matchId)
                .order('minute', { ascending: true })
                .order('bonus_minute', { ascending: true, nullsFirst: true })
                .order('created_at', { ascending: true });
            if (res.error) throw res.error;
            setEvents((res.data ?? []) as MatchEventDetailed[]);
        } catch (e) {
            setEventsError(
                e instanceof Error
                    ? e.message
                    : 'Không tải được danh sách sự kiện',
            );
        } finally {
            setIsLoadingEvents(false);
        }
    }, [matchId]);

    useEffect(() => {
        void loadEvents();
    }, [loadEvents]);

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/30 px-3 py-3 sm:px-4 sm:py-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            {homeName}
                        </span>
                        <span
                            className="mt-1 h-1.5 w-10 rounded-sm"
                            style={{
                                backgroundColor: homeColor ?? 'transparent',
                            }}
                            aria-hidden
                        />
                        <span className="text-lg font-semibold">
                            {match?.home_score ?? 0}
                        </span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                        Kết quả chung cuộc
                    </span>
                    <div className="flex flex-col items-end">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            {awayName}
                        </span>
                        <span
                            className="mt-1 h-1.5 w-10 rounded-sm"
                            style={{
                                backgroundColor: awayColor ?? 'transparent',
                            }}
                            aria-hidden
                        />
                        <span className="text-lg font-semibold">
                            {match?.away_score ?? 0}
                        </span>
                    </div>
                </div>

                {(match?.penalty_home ?? 0) > 0 ||
                (match?.penalty_away ?? 0) > 0 ? (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Penalty:</span>
                        <span className="font-medium">
                            {match?.penalty_home ?? 0} -{' '}
                            {match?.penalty_away ?? 0}
                        </span>
                    </div>
                ) : null}
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">
                            Sự kiện ({events.length})
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadEvents}
                        disabled={isLoadingEvents}
                        className="gap-2"
                    >
                        {isLoadingEvents && <Spinner className="size-4" />}
                        Tải lại
                    </Button>
                </div>

                {eventsError && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {eventsError}
                    </p>
                )}

                {isLoadingEvents ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Spinner className="size-4" /> Đang tải…
                    </div>
                ) : events.length ? (
                    <div className="rounded-xl border overflow-hidden">
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] text-muted-foreground bg-muted/30">
                            <div className="col-span-2">Phút</div>
                            <div className="col-span-3">Loại</div>
                            <div className="col-span-7">Chi tiết</div>
                        </div>
                        <div className="max-h-[360px] overflow-auto">
                            {events.map((ev) => {
                                const p = ev.players;
                                const out = ev.player_out;
                                const pTeam =
                                    p?.team_id != null &&
                                    p.team_id === teamById.homeId
                                        ? homeName
                                        : p?.team_id != null &&
                                            p.team_id === teamById.awayId
                                          ? awayName
                                          : '';
                                return (
                                    <div
                                        key={ev.id}
                                        className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-t"
                                    >
                                        <div className="col-span-2">
                                            {formatEventMinute(ev)}'
                                        </div>
                                        <div className="col-span-3">
                                            <span
                                                className={cn(
                                                    'text-xs font-medium',
                                                    ev.type === 'GOAL' &&
                                                        'text-green-600',
                                                    ev.type === 'YELLOW' &&
                                                        'text-yellow-500',
                                                    ev.type === 'RED' &&
                                                        'text-red-500',
                                                )}
                                            >
                                                {EVENT_TYPE_LABELS[ev.type]}
                                            </span>
                                        </div>
                                        <div className="col-span-7">
                                            <span className="text-muted-foreground">
                                                {pTeam && `${pTeam} — `}
                                            </span>
                                            <span className="font-medium">
                                                {playerLabel(p)}
                                            </span>
                                            {ev.type === 'SUB' && out ? (
                                                <span className="text-muted-foreground">
                                                    {' '}
                                                    (ra {playerLabel(out)})
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Chưa có sự kiện nào.
                    </p>
                )}
            </div>
        </div>
    );
}

interface PostMatchPanelProps {
    match: MatchWithTeams | null;
}

export default function PostMatchPanel({ match }: PostMatchPanelProps) {
    return (
        <Card className="rounded-2xl">
            <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3">
                <CardTitle className="text-base sm:text-lg">
                    Thống kê sau trận đấu
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
                <MatchStats match={match} />
            </CardContent>
        </Card>
    );
}
