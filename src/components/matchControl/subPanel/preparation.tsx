import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { MatchWithTeams } from '@/services/matches.api';
import type { MatchConfigRow } from '@/services/match-config.api';
import { supabase } from '@/lib/supabase/client';
import { setLineupForTeams } from '@/services/players.api';

type PlayerRowLite = {
    id: number;
    full_name: string | null;
    nickname: string | null;
    number: number;
    team_id: number | null;
    is_on_field: boolean;
    is_substitute: boolean;
};

interface PreparationPanelProps {
    match: MatchWithTeams | null;
    matchConfig: MatchConfigRow | null;
    userId: string;
    onMatchUpdated?: () => void;
}

function playerLabel(p: PlayerRowLite) {
    const name = p.nickname?.trim() || p.full_name?.trim() || 'Unknown';
    return `#${p.number} ${name}`;
}

export default function PreparationPanel({
    match,
    matchConfig,
    userId,
    onMatchUpdated,
}: PreparationPanelProps) {
    const homeTeamId = match?.home_team ?? null;
    const awayTeamId = match?.away_team ?? null;
    const playersPerTeam = matchConfig?.players_per_team ?? 11;

    const [players, setPlayers] = useState<PlayerRowLite[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [homeSelected, setHomeSelected] = useState<Set<number>>(new Set());
    const [awaySelected, setAwaySelected] = useState<Set<number>>(new Set());

    const teamIds = useMemo(() => {
        const ids: number[] = [];
        if (homeTeamId != null) ids.push(homeTeamId);
        if (awayTeamId != null) ids.push(awayTeamId);
        return ids;
    }, [homeTeamId, awayTeamId]);

    const homePlayers = useMemo(
        () => players.filter((p) => p.team_id === homeTeamId),
        [players, homeTeamId],
    );
    const awayPlayers = useMemo(
        () => players.filter((p) => p.team_id === awayTeamId),
        [players, awayTeamId],
    );

    const loadPlayers = async () => {
        if (!teamIds.length) {
            setPlayers([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const res = await supabase
                .from('players')
                .select(
                    'id, full_name, nickname, number, team_id, is_on_field, is_substitute',
                )
                .eq('user_id', userId)
                .in('team_id', teamIds)
                .order('number', { ascending: true });
            if (res.error) throw res.error;

            const rows = (res.data ?? []) as PlayerRowLite[];
            setPlayers(rows);

            // sync selection from DB state
            const home = new Set<number>();
            const away = new Set<number>();
            for (const p of rows) {
                if (!p.is_on_field) continue;
                if (p.team_id === homeTeamId) home.add(p.id);
                if (p.team_id === awayTeamId) away.add(p.id);
            }
            setHomeSelected(home);
            setAwaySelected(away);
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : 'Không tải được danh sách cầu thủ',
            );
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadPlayers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, homeTeamId, awayTeamId]);

    const toggleHome = (playerId: number) => {
        setError(null);
        setSuccess(null);
        setHomeSelected((prev) => {
            const next = new Set(prev);
            if (next.has(playerId)) {
                next.delete(playerId);
                return next;
            }
            if (next.size >= playersPerTeam) {
                setError(
                    `Đội nhà chỉ được chọn tối đa ${playersPerTeam} cầu thủ`,
                );
                return prev;
            }
            next.add(playerId);
            return next;
        });
    };

    const toggleAway = (playerId: number) => {
        setError(null);
        setSuccess(null);
        setAwaySelected((prev) => {
            const next = new Set(prev);
            if (next.has(playerId)) {
                next.delete(playerId);
                return next;
            }
            if (next.size >= playersPerTeam) {
                setError(
                    `Đội khách chỉ được chọn tối đa ${playersPerTeam} cầu thủ`,
                );
                return prev;
            }
            next.add(playerId);
            return next;
        });
    };

    const saveLineup = async () => {
        if (!homeTeamId || !awayTeamId) return;
        setIsSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const onFieldIds = [
                ...Array.from(homeSelected),
                ...Array.from(awaySelected),
            ];
            await setLineupForTeams({
                userId,
                teamIds: [homeTeamId, awayTeamId],
                onFieldPlayerIds: onFieldIds,
            });
            setSuccess('Đã lưu đội hình ra sân');
            await loadPlayers();
            onMatchUpdated?.();
        } catch (e) {
            setError(
                e instanceof Error ? e.message : 'Không lưu được đội hình',
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (!match) {
        return (
            <Card>
                <CardContent className="py-6">
                    <p className="text-muted-foreground">
                        Chưa có trận đấu. Vui lòng tạo trận ở bước Initiation.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!homeTeamId || !awayTeamId) {
        return (
            <Card>
                <CardContent className="py-6">
                    <p className="text-muted-foreground">
                        Vui lòng chọn đội nhà/đội khách ở bước Initiation trước.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-2xl">
            <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg">
                    Đội hình ra sân
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-5 pt-0 sm:px-6 sm:pb-6 space-y-4">
                {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                        {success}
                    </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Đội nhà</Label>
                            <span className="text-xs text-muted-foreground">
                                {homeSelected.size}/{playersPerTeam}
                            </span>
                        </div>
                        <div className="rounded-xl border p-2 space-y-1 max-h-[320px] overflow-auto">
                            {isLoading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                    <Spinner className="size-4" /> Đang tải…
                                </div>
                            ) : homePlayers.length ? (
                                homePlayers.map((p) => (
                                    <label
                                        key={p.id}
                                        className={cn(
                                            'flex items-center gap-2 rounded-md px-2 py-1 text-sm',
                                            'hover:bg-muted/50 cursor-pointer',
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={homeSelected.has(p.id)}
                                            onChange={() => toggleHome(p.id)}
                                            disabled={isSaving}
                                        />
                                        <span className="flex-1">
                                            {playerLabel(p)}
                                        </span>
                                    </label>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground py-2">
                                    Chưa có cầu thủ cho đội này.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Đội khách</Label>
                            <span className="text-xs text-muted-foreground">
                                {awaySelected.size}/{playersPerTeam}
                            </span>
                        </div>
                        <div className="rounded-xl border p-2 space-y-1 max-h-[320px] overflow-auto">
                            {isLoading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                    <Spinner className="size-4" /> Đang tải…
                                </div>
                            ) : awayPlayers.length ? (
                                awayPlayers.map((p) => (
                                    <label
                                        key={p.id}
                                        className={cn(
                                            'flex items-center gap-2 rounded-md px-2 py-1 text-sm',
                                            'hover:bg-muted/50 cursor-pointer',
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={awaySelected.has(p.id)}
                                            onChange={() => toggleAway(p.id)}
                                            disabled={isSaving}
                                        />
                                        <span className="flex-1">
                                            {playerLabel(p)}
                                        </span>
                                    </label>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground py-2">
                                    Chưa có cầu thủ cho đội này.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end">
                    <Button
                        onClick={saveLineup}
                        disabled={isSaving || isLoading}
                        className="w-full sm:w-auto"
                    >
                        {isSaving ? (
                            <>
                                <Spinner className="mr-2 size-4" />
                                Đang lưu…
                            </>
                        ) : (
                            'Lưu đội hình'
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
