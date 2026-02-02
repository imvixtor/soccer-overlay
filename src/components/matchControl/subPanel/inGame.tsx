import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    EVENT_TYPE_LABELS,
    getTimeOffset,
    type EventType,
    type MatchPhase,
} from '@/lib/match-constants';
import type { MatchWithTeams } from '@/services/matches.api';
import { updateMatch } from '@/services/matches.api';
import {
    createMatchEvent,
    deleteMatchEvent,
    listMatchEventsByMatchId,
    type MatchEventRow,
} from '@/services/match-events.api';
import { supabase } from '@/lib/supabase/client';
import { updatePlayer } from '@/services/players.api';

type PlayerRowLite = {
    id: number;
    full_name: string | null;
    nickname: string | null;
    number: number;
    team_id: number | null;
    is_on_field: boolean;
    is_substitute: boolean;
};

type InGameModal = 'CARD' | 'GOAL' | 'SUB' | 'CLOCK' | null;

interface InGamePanelProps {
    phase: MatchPhase;
    match: MatchWithTeams | null;
    userId: string;
    currentMinute: number;
    matchTime: string;
    halfDuration: number;
    extraDuration: number;
    onMatchUpdated?: () => void;
}

function playerLabel(p: PlayerRowLite) {
    const name = p.nickname?.trim() || p.full_name?.trim() || 'Unknown';
    return `#${p.number} ${name}`;
}

function teamLabel(p: PlayerRowLite, match: MatchWithTeams | null) {
    if (!match) return '';
    if (p.team_id != null && p.team_id === match.home_team) {
        return match.home_team_data?.short_name ?? 'HOME';
    }
    if (p.team_id != null && p.team_id === match.away_team) {
        return match.away_team_data?.short_name ?? 'AWAY';
    }
    return '';
}

export default function InGamePanel({
    phase,
    match,
    userId,
    currentMinute,
    matchTime,
    halfDuration,
    extraDuration,
    onMatchUpdated,
}: InGamePanelProps) {
    const matchId = match?.id ?? null;
    const homeTeamId = match?.home_team ?? null;
    const awayTeamId = match?.away_team ?? null;

    const dialogRef = useRef<HTMLDialogElement>(null);
    const [activeModal, setActiveModal] = useState<InGameModal>(null);

    const [players, setPlayers] = useState<PlayerRowLite[]>([]);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
    const [playersError, setPlayersError] = useState<string | null>(null);

    const [events, setEvents] = useState<MatchEventRow[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [eventsError, setEventsError] = useState<string | null>(null);

    // Form states
    const [selectedPlayerId, setSelectedPlayerId] = useState<number | ''>('');
    const [cardType, setCardType] = useState<EventType>('YELLOW');
    const [subPlayerOutId, setSubPlayerOutId] = useState<number | ''>('');
    const [subPlayerInId, setSubPlayerInId] = useState<number | ''>('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [clockMinute, setClockMinute] = useState<number>(currentMinute);

    const playerById = useMemo(() => {
        const map = new Map<number, PlayerRowLite>();
        for (const p of players) map.set(p.id, p);
        return map;
    }, [players]);

    const loadPlayers = async () => {
        if (!matchId || !homeTeamId || !awayTeamId) {
            setPlayers([]);
            return;
        }
        setIsLoadingPlayers(true);
        setPlayersError(null);
        try {
            const res = await supabase
                .from('players')
                .select(
                    'id, full_name, nickname, number, team_id, is_on_field, is_substitute',
                )
                .eq('user_id', userId)
                .in('team_id', [homeTeamId, awayTeamId])
                .order('team_id', { ascending: true })
                .order('number', { ascending: true });
            if (res.error) throw res.error;
            setPlayers((res.data ?? []) as PlayerRowLite[]);
        } catch (e) {
            setPlayersError(
                e instanceof Error
                    ? e.message
                    : 'Không tải được danh sách cầu thủ',
            );
        } finally {
            setIsLoadingPlayers(false);
        }
    };

    const loadEvents = async () => {
        if (!matchId) {
            setEvents([]);
            return;
        }
        setIsLoadingEvents(true);
        setEventsError(null);
        try {
            const res = await listMatchEventsByMatchId(matchId);
            if (res.error) throw res.error;
            setEvents(res.data);
        } catch (e) {
            setEventsError(
                e instanceof Error
                    ? e.message
                    : 'Không tải được danh sách sự kiện',
            );
        } finally {
            setIsLoadingEvents(false);
        }
    };

    useEffect(() => {
        void loadPlayers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchId, userId, homeTeamId, awayTeamId]);

    // Open/close dialog by state
    useEffect(() => {
        if (activeModal) dialogRef.current?.showModal();
        else dialogRef.current?.close();
    }, [activeModal]);

    // Load events when match thay đổi
    useEffect(() => {
        void loadEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchId]);

    const resetFormMessages = () => {
        setFormError(null);
        setFormSuccess(null);
    };

    const closeModal = () => {
        setActiveModal(null);
        setIsSubmitting(false);
        resetFormMessages();
    };

    const ensureReady = () => {
        if (!matchId) {
            setFormError('Chưa có trận đấu.');
            return false;
        }
        if (!homeTeamId || !awayTeamId) {
            setFormError('Chưa chọn đủ đội nhà/đội khách.');
            return false;
        }
        return true;
    };

    const submitGoal = async () => {
        resetFormMessages();
        if (!ensureReady() || selectedPlayerId === '' || !matchId) return;
        setIsSubmitting(true);
        try {
            const player = playerById.get(Number(selectedPlayerId));
            if (!player) throw new Error('Cầu thủ không hợp lệ');

            const { error } = await createMatchEvent({
                match_id: matchId,
                minute: currentMinute,
                player_id: Number(selectedPlayerId),
                type: 'GOAL',
            });
            if (error) throw error;

            // Update score based on player's team
            const isHomeScorer =
                player.team_id != null && player.team_id === match?.home_team;
            const isAwayScorer =
                player.team_id != null && player.team_id === match?.away_team;

            if (match && (isHomeScorer || isAwayScorer)) {
                const nextHome =
                    (match.home_score ?? 0) + (isHomeScorer ? 1 : 0);
                const nextAway =
                    (match.away_score ?? 0) + (isAwayScorer ? 1 : 0);
                const up = await updateMatch(matchId, {
                    home_score: nextHome,
                    away_score: nextAway,
                });
                if (up.error) throw up.error;
            }

            setFormSuccess('Đã thêm bàn thắng');
            await loadEvents();
            onMatchUpdated?.();
        } catch (e) {
            setFormError(
                e instanceof Error ? e.message : 'Không thêm được bàn thắng',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitCard = async () => {
        resetFormMessages();
        if (!ensureReady() || selectedPlayerId === '' || !matchId) return;
        setIsSubmitting(true);
        try {
            if (cardType !== 'YELLOW' && cardType !== 'RED') {
                throw new Error('Loại thẻ không hợp lệ');
            }
            const { error } = await createMatchEvent({
                match_id: matchId,
                minute: currentMinute,
                player_id: Number(selectedPlayerId),
                type: cardType,
            });
            if (error) throw error;

            setFormSuccess('Đã thêm thẻ phạt');
            await loadEvents();
            onMatchUpdated?.();
        } catch (e) {
            setFormError(
                e instanceof Error ? e.message : 'Không thêm được thẻ phạt',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitSub = async () => {
        resetFormMessages();
        if (!ensureReady() || !matchId) return;
        if (subPlayerOutId === '' || subPlayerInId === '') {
            setFormError('Vui lòng chọn cả cầu thủ ra và vào');
            return;
        }
        const outP = playerById.get(Number(subPlayerOutId));
        const inP = playerById.get(Number(subPlayerInId));
        if (!outP || !inP) {
            setFormError('Cầu thủ không hợp lệ');
            return;
        }
        if (
            outP.team_id == null ||
            inP.team_id == null ||
            outP.team_id !== inP.team_id
        ) {
            setFormError('Cầu thủ vào/ra phải cùng một đội');
            return;
        }
        setIsSubmitting(true);
        try {
            const { error } = await createMatchEvent({
                match_id: matchId,
                minute: currentMinute,
                player_id: Number(subPlayerInId),
                player_out_id: Number(subPlayerOutId),
                type: 'SUB',
            });
            if (error) throw error;

            // Update player states
            await updatePlayer(Number(subPlayerOutId), userId, {
                is_on_field: false,
                is_substitute: false,
            });
            await updatePlayer(Number(subPlayerInId), userId, {
                is_on_field: true,
                is_substitute: false,
            });

            setFormSuccess('Đã thêm thay người');
            await loadPlayers();
            await loadEvents();
            onMatchUpdated?.();
        } catch (e) {
            setFormError(
                e instanceof Error ? e.message : 'Không thêm được thay người',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEvent = async (ev: MatchEventRow) => {
        resetFormMessages();
        if (!matchId) return;
        setIsSubmitting(true);
        try {
            const { error } = await deleteMatchEvent(ev.id);
            if (error) throw error;

            // Keep score consistent when deleting GOAL
            if (ev.type === 'GOAL' && match) {
                const scorer = playerById.get(ev.player_id);
                const isHome =
                    scorer?.team_id != null &&
                    scorer.team_id === match.home_team;
                const isAway =
                    scorer?.team_id != null &&
                    scorer.team_id === match.away_team;

                const nextHome = Math.max(
                    0,
                    (match.home_score ?? 0) - (isHome ? 1 : 0),
                );
                const nextAway = Math.max(
                    0,
                    (match.away_score ?? 0) - (isAway ? 1 : 0),
                );
                const up = await updateMatch(matchId, {
                    home_score: nextHome,
                    away_score: nextAway,
                });
                if (up.error) throw up.error;
            }

            await loadEvents();
            onMatchUpdated?.();
        } catch (e) {
            setFormError(
                e instanceof Error ? e.message : 'Không xoá được sự kiện',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const canUseInGame = Boolean(matchId && homeTeamId && awayTeamId);

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

    return (
        <div className="space-y-3">
            <div className="rounded-2xl border bg-card px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex flex-col items-start">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {homeName}
                    </span>
                    <span
                        className="mt-1 h-1.5 w-10 rounded-sm"
                        style={{ backgroundColor: homeColor ?? 'transparent' }}
                        aria-hidden
                    />
                    <span className="text-2xl font-semibold">
                        {match?.home_score ?? 0}
                    </span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {phase}
                    </span>
                    <span className="text-sm font-medium">{matchTime}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {awayName}
                    </span>
                    <span
                        className="mt-1 h-1.5 w-10 rounded-sm"
                        style={{ backgroundColor: awayColor ?? 'transparent' }}
                        aria-hidden
                    />
                    <span className="text-2xl font-semibold">
                        {match?.away_score ?? 0}
                    </span>
                </div>
            </div>

            {playersError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {playersError}
                </div>
            )}

            <div className="grid gap-2 grid-cols-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        resetFormMessages();
                        setSelectedPlayerId('');
                        setActiveModal('CARD');
                    }}
                    disabled={!canUseInGame}
                >
                    Thêm thẻ phạt
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        resetFormMessages();
                        setSelectedPlayerId('');
                        setActiveModal('GOAL');
                    }}
                    disabled={!canUseInGame}
                >
                    Bàn thắng
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        resetFormMessages();
                        setSubPlayerOutId('');
                        setSubPlayerInId('');
                        setActiveModal('SUB');
                    }}
                    disabled={!canUseInGame}
                >
                    Thay người
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        resetFormMessages();
                        setClockMinute(currentMinute);
                        setActiveModal('CLOCK');
                    }}
                    disabled={!matchId}
                >
                    Đặt đồng hồ
                </Button>
            </div>

            {/* Danh sách sự kiện luôn hiển thị */}
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                        Sự kiện ({events.length})
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadEvents}
                        disabled={isLoadingEvents || isSubmitting}
                        className="gap-2"
                    >
                        {(isLoadingEvents || isSubmitting) && (
                            <Spinner className="size-4" />
                        )}
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
                    <div className="rounded-md border overflow-hidden">
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground bg-muted/30">
                            <div className="col-span-2">Phút</div>
                            <div className="col-span-3">Loại</div>
                            <div className="col-span-6">Cầu thủ</div>
                            <div className="col-span-1 text-right"> </div>
                        </div>
                        <div className="max-h-[360px] overflow-auto">
                            {events.map((ev) => {
                                const p = playerById.get(ev.player_id);
                                const label = p
                                    ? `${teamLabel(p, match)} ${playerLabel(p)}`
                                    : `#${ev.player_id}`;
                                return (
                                    <div
                                        key={ev.id}
                                        className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-t items-center"
                                    >
                                        <div className="col-span-2">
                                            {ev.minute}'
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
                                        <div className="col-span-6">
                                            {label}
                                            {ev.type === 'SUB' &&
                                                ev.player_out_id && (
                                                    <span className="text-muted-foreground">
                                                        {' '}
                                                        (ra #{ev.player_out_id})
                                                    </span>
                                                )}
                                        </div>
                                        <div className="col-span-1 text-right">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() =>
                                                    handleDeleteEvent(
                                                        ev as MatchEventRow,
                                                    )
                                                }
                                                disabled={isSubmitting}
                                            >
                                                Xoá
                                            </Button>
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

            <dialog
                ref={dialogRef}
                className={cn(
                    'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                    'w-full max-w-[calc(100vw-2rem)] sm:max-w-lg',
                    'rounded-2xl border bg-card p-0 shadow-2xl',
                    'backdrop:bg-black/60 backdrop:backdrop-blur-sm',
                )}
                onCancel={closeModal}
            >
                <CardHeader className="shrink-0 px-4 pt-4 pb-2">
                    <CardTitle className="text-lg sm:text-xl">
                        {activeModal === 'CARD' && 'Thêm thẻ phạt'}
                        {activeModal === 'GOAL' && 'Thêm bàn thắng'}
                        {activeModal === 'SUB' && 'Thêm thay người'}
                        {activeModal === 'CLOCK' && 'Đặt đồng hồ'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-4 pb-5 pt-0">
                    {(formError || eventsError) && (
                        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {formError ?? eventsError}
                        </p>
                    )}
                    {formSuccess && (
                        <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                            {formSuccess}
                        </p>
                    )}

                    {(activeModal === 'CARD' ||
                        activeModal === 'GOAL' ||
                        activeModal === 'SUB') && (
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Thời điểm hiện tại:{' '}
                                <span className="font-medium">
                                    {currentMinute}'
                                </span>
                            </p>
                        </div>
                    )}

                    {activeModal === 'CARD' && (
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="card-type">Loại thẻ</Label>
                                    <select
                                        id="card-type"
                                        value={cardType}
                                        onChange={(e) =>
                                            setCardType(
                                                e.target.value as EventType,
                                            )
                                        }
                                        className={cn(
                                            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                            'disabled:cursor-not-allowed disabled:opacity-50',
                                        )}
                                        disabled={isSubmitting}
                                    >
                                        <option value="YELLOW">
                                            {EVENT_TYPE_LABELS.YELLOW}
                                        </option>
                                        <option value="RED">
                                            {EVENT_TYPE_LABELS.RED}
                                        </option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="player-id">Cầu thủ</Label>
                                    <select
                                        id="player-id"
                                        value={selectedPlayerId}
                                        onChange={(e) =>
                                            setSelectedPlayerId(
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : '',
                                            )
                                        }
                                        className={cn(
                                            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                            'disabled:cursor-not-allowed disabled:opacity-50',
                                        )}
                                        disabled={
                                            isSubmitting || isLoadingPlayers
                                        }
                                    >
                                        <option value="">
                                            -- Chọn cầu thủ --
                                        </option>
                                        {players.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {teamLabel(p, match)}{' '}
                                                {playerLabel(p)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-2 sm:pt-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeModal}
                                    disabled={isSubmitting}
                                >
                                    Đóng
                                </Button>
                                <Button
                                    type="button"
                                    onClick={submitCard}
                                    disabled={isSubmitting}
                                    className="gap-2"
                                >
                                    {isSubmitting && (
                                        <Spinner className="size-4" />
                                    )}
                                    Lưu
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeModal === 'GOAL' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="goal-player">
                                    Cầu thủ ghi bàn
                                </Label>
                                <select
                                    id="goal-player"
                                    value={selectedPlayerId}
                                    onChange={(e) =>
                                        setSelectedPlayerId(
                                            e.target.value
                                                ? Number(e.target.value)
                                                : '',
                                        )
                                    }
                                    className={cn(
                                        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                        'disabled:cursor-not-allowed disabled:opacity-50',
                                    )}
                                    disabled={isSubmitting || isLoadingPlayers}
                                >
                                    <option value="">-- Chọn cầu thủ --</option>
                                    {players.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {teamLabel(p, match)}{' '}
                                            {playerLabel(p)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-2 sm:pt-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeModal}
                                    disabled={isSubmitting}
                                >
                                    Đóng
                                </Button>
                                <Button
                                    type="button"
                                    onClick={submitGoal}
                                    disabled={isSubmitting}
                                    className="gap-2"
                                >
                                    {isSubmitting && (
                                        <Spinner className="size-4" />
                                    )}
                                    Lưu
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeModal === 'SUB' && (
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="sub-out">Cầu thủ ra</Label>
                                    <select
                                        id="sub-out"
                                        value={subPlayerOutId}
                                        onChange={(e) =>
                                            setSubPlayerOutId(
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : '',
                                            )
                                        }
                                        className={cn(
                                            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                            'disabled:cursor-not-allowed disabled:opacity-50',
                                        )}
                                        disabled={
                                            isSubmitting || isLoadingPlayers
                                        }
                                    >
                                        <option value="">
                                            -- Chọn cầu thủ --
                                        </option>
                                        {players
                                            .filter((p) => p.is_on_field)
                                            .map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {teamLabel(p, match)}{' '}
                                                    {playerLabel(p)}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sub-in">Cầu thủ vào</Label>
                                    <select
                                        id="sub-in"
                                        value={subPlayerInId}
                                        onChange={(e) =>
                                            setSubPlayerInId(
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : '',
                                            )
                                        }
                                        className={cn(
                                            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                            'disabled:cursor-not-allowed disabled:opacity-50',
                                        )}
                                        disabled={
                                            isSubmitting ||
                                            isLoadingPlayers ||
                                            !subPlayerOutId
                                        }
                                    >
                                        <option value="">
                                            -- Chọn cầu thủ --
                                        </option>
                                        {players
                                            .filter((p) => {
                                                if (!p.is_substitute) {
                                                    return false;
                                                }
                                                if (!subPlayerOutId) {
                                                    return true;
                                                }
                                                const outPlayer =
                                                    playerById.get(
                                                        Number(subPlayerOutId),
                                                    );
                                                if (!outPlayer) {
                                                    return true;
                                                }
                                                return (
                                                    p.team_id != null &&
                                                    outPlayer.team_id != null &&
                                                    p.team_id ===
                                                        outPlayer.team_id
                                                );
                                            })
                                            .map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {teamLabel(p, match)}{' '}
                                                    {playerLabel(p)}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-2 sm:pt-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeModal}
                                    disabled={isSubmitting}
                                >
                                    Đóng
                                </Button>
                                <Button
                                    type="button"
                                    onClick={submitSub}
                                    disabled={isSubmitting}
                                    className="gap-2"
                                >
                                    {isSubmitting && (
                                        <Spinner className="size-4" />
                                    )}
                                    Lưu
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeModal === 'CLOCK' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="clock-minute">
                                    Phút trên đồng hồ
                                </Label>
                                <Input
                                    id="clock-minute"
                                    type="number"
                                    min="0"
                                    value={clockMinute}
                                    onChange={(e) =>
                                        setClockMinute(
                                            Number.parseInt(e.target.value) ||
                                                0,
                                        )
                                    }
                                    disabled={isSubmitting}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Ví dụ: nhập 15 nếu đồng hồ trận đang ở phút
                                    15.
                                </p>
                            </div>

                            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-2 sm:pt-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeModal}
                                    disabled={isSubmitting}
                                >
                                    Đóng
                                </Button>
                                <Button
                                    type="button"
                                    onClick={async () => {
                                        resetFormMessages();
                                        if (!matchId) return;
                                        setIsSubmitting(true);
                                        try {
                                            const offsetSeconds = getTimeOffset(
                                                phase,
                                                halfDuration,
                                                extraDuration,
                                            );
                                            const desiredSeconds = Math.max(
                                                0,
                                                clockMinute * 60,
                                            );
                                            const elapsedSeconds = Math.max(
                                                0,
                                                desiredSeconds - offsetSeconds,
                                            );
                                            const nowMs = Date.now();
                                            const startAt = new Date(
                                                nowMs - elapsedSeconds * 1000,
                                            ).toISOString();

                                            const { error } = await updateMatch(
                                                matchId,
                                                {
                                                    start_at: startAt,
                                                    stop_at: null,
                                                },
                                            );
                                            if (error) throw error;
                                            setFormSuccess(
                                                'Đã cập nhật đồng hồ',
                                            );
                                            onMatchUpdated?.();
                                        } catch (e) {
                                            setFormError(
                                                e instanceof Error
                                                    ? e.message
                                                    : 'Không cập nhật được đồng hồ',
                                            );
                                        } finally {
                                            setIsSubmitting(false);
                                        }
                                    }}
                                    disabled={isSubmitting}
                                    className="gap-2"
                                >
                                    {isSubmitting && (
                                        <Spinner className="size-4" />
                                    )}
                                    Cập nhật
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </dialog>
        </div>
    );
}

//hiển thị các chức năng điều khiển trong trận đấu, thông tin cơ bản của 2 đội (tên, tỉ số, màu)
//có một toggle để chuyển giữa các nút điều khiển trận đấu và các nút điều khiển ẩn hiện overlay
//các nút điều khiển trận đấu: thêm bàn thắng, thẻ phạt, thay người, xóa sự kiện đã thêm
//các nút điều khiển overlay: trong supabase types bảng control.
