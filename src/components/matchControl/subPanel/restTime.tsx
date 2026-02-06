import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MatchPhase } from '@/lib/match-constants';
import type { MatchWithTeams } from '@/services/matches.api';
import { MatchStats } from './post_match';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { updateMatch } from '@/services/matches.api';
import { upsertOverlayControl } from '@/services/control.api';
import type { OverlayControlRow } from '@/services/control.api';

interface RestTimePanelProps {
    phase: MatchPhase;
    match: MatchWithTeams | null;
    userId?: string;
    overlayControl?: OverlayControlRow | null;
    onMatchUpdated?: () => void;
}

export default function RestTimePanel({
    phase,
    match,
    userId,
    overlayControl,
    onMatchUpdated,
}: RestTimePanelProps) {
    const matchId = match?.id ?? null;
    const homeTeamLabel =
        match?.home_team_data?.short_name ||
        match?.home_team_data?.name ||
        'Đội nhà';
    const awayTeamLabel =
        match?.away_team_data?.short_name ||
        match?.away_team_data?.name ||
        'Đội khách';
    const [homeColor, setHomeColor] = useState<string>(
        match?.home_color ?? '#ffffff',
    );
    const [awayColor, setAwayColor] = useState<string>(
        match?.away_color ?? '#000000',
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isLineupSaving, setIsLineupSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const current = overlayControl ?? {
        lineup_enable: false,
        away_lineup: false,
        commentary_script: null,
        // Các field còn lại không dùng trong RestTimePanel nhưng cần cho type đầy đủ
        id: 0,
        user_id: userId ?? '',
        match_status_enable: false,
        scorebug_enable: true,
        clock_enable: true,
    };
    const isLineupHomeActive = current.lineup_enable && !current.away_lineup;
    const isLineupAwayActive = current.lineup_enable && current.away_lineup;

    const updateLineup = async (showHome: boolean) => {
        if (!userId) return;
        setIsLineupSaving(true);
        try {
            const base: OverlayControlRow = overlayControl ?? {
                id: 0,
                user_id: userId,
                match_status_enable: false,
                lineup_enable: false,
                scorebug_enable: true,
                clock_enable: true,
                away_lineup: false,
                commentary_script: null,
            };
            const isActive = showHome ? isLineupHomeActive : isLineupAwayActive;
            const next: OverlayControlRow = isActive
                ? { ...base, lineup_enable: false }
                : {
                      ...base,
                      match_status_enable: false,
                      lineup_enable: true,
                      away_lineup: !showHome,
                  };
            const { error } = await upsertOverlayControl(userId, next);
            if (!error) onMatchUpdated?.();
        } finally {
            setIsLineupSaving(false);
        }
    };

    useEffect(() => {
        setHomeColor(match?.home_color ?? '#ffffff');
        setAwayColor(match?.away_color ?? '#000000');
    }, [match?.home_color, match?.away_color]);

    const saveColors = async () => {
        if (!matchId) return;
        setIsSaving(true);
        setError(null);
        try {
            const res = await updateMatch(matchId, {
                home_color: homeColor,
                away_color: awayColor,
            });
            if (res.error) throw res.error;
            onMatchUpdated?.();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không lưu được màu áo');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="rounded-2xl">
            <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3">
                <CardTitle className="text-base sm:text-lg">
                    Nghỉ — {phase}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-5 pt-0 sm:px-6 sm:pb-6 space-y-3">
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">Màu áo</span>
                        <Button
                            type="button"
                            size="sm"
                            onClick={saveColors}
                            disabled={!matchId || isSaving}
                            className="gap-2"
                        >
                            {isSaving && <Spinner className="size-4" />}
                            Lưu
                        </Button>
                    </div>

                    {error && (
                        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/30 px-2 py-2">
                            <div className="min-w-0">
                                <p className="truncate text-sm text-muted-foreground">
                                    {homeTeamLabel}
                                </p>
                                <div
                                    className="mt-1 h-1.5 w-10 rounded-sm"
                                    style={{ backgroundColor: homeColor }}
                                    aria-hidden
                                />
                            </div>
                            <input
                                type="color"
                                value={homeColor}
                                onChange={(e) => setHomeColor(e.target.value)}
                                disabled={!matchId || isSaving}
                                aria-label="Màu áo đội nhà"
                                className="h-8 w-9 shrink-0 rounded-md border bg-background p-1"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/30 px-2 py-2">
                            <div className="min-w-0">
                                <p className="truncate text-sm text-muted-foreground">
                                    {awayTeamLabel}
                                </p>
                                <div
                                    className="mt-1 h-1.5 w-10 rounded-sm"
                                    style={{ backgroundColor: awayColor }}
                                    aria-hidden
                                />
                            </div>
                            <input
                                type="color"
                                value={awayColor}
                                onChange={(e) => setAwayColor(e.target.value)}
                                disabled={!matchId || isSaving}
                                aria-label="Màu áo đội khách"
                                className="h-8 w-9 shrink-0 rounded-md border bg-background p-1"
                            />
                        </div>
                    </div>
                </div>

                {phase === 'PRE_MATCH' && userId && (
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant={
                                    isLineupHomeActive ? 'default' : 'outline'
                                }
                                size="sm"
                                onClick={() => updateLineup(true)}
                                disabled={isLineupSaving}
                                className="gap-2"
                            >
                                {isLineupSaving && (
                                    <Spinner className="size-4" />
                                )}
                                {isLineupHomeActive ? 'Ẩn' : 'Hiện'} lineup{' '}
                                {homeTeamLabel}
                            </Button>
                            <Button
                                type="button"
                                variant={
                                    isLineupAwayActive ? 'default' : 'outline'
                                }
                                size="sm"
                                onClick={() => updateLineup(false)}
                                disabled={isLineupSaving}
                                className="gap-2"
                            >
                                {isLineupAwayActive ? 'Ẩn' : 'Hiện'} lineup{' '}
                                {awayTeamLabel}
                            </Button>
                        </div>
                    </div>
                )}

                <MatchStats match={match} />
            </CardContent>
        </Card>
    );
}
