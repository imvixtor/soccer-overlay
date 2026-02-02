import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { MatchWithTeams } from '@/services/matches.api';
import { updateMatch } from '@/services/matches.api';

interface PenaltyShootPanelProps {
    match: MatchWithTeams | null;
}

export default function PenaltyShootPanel({ match }: PenaltyShootPanelProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const matchId = match?.id ?? null;
    const homePenalty = match?.penalty_home ?? 0;
    const awayPenalty = match?.penalty_away ?? 0;

    const updatePenalty = async (side: 'home' | 'away', delta: 1 | -1) => {
        if (!matchId) return;
        setError(null);
        setIsSubmitting(true);
        try {
            const nextHome =
                side === 'home'
                    ? Math.max(0, homePenalty + delta)
                    : homePenalty;
            const nextAway =
                side === 'away'
                    ? Math.max(0, awayPenalty + delta)
                    : awayPenalty;

            const res = await updateMatch(matchId, {
                penalty_home: nextHome,
                penalty_away: nextAway,
            });
            if (res.error) throw res.error;
        } catch (e) {
            setError(
                e instanceof Error ? e.message : 'Không cập nhật được tỉ số',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="rounded-2xl">
            <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3">
                <CardTitle className="text-base sm:text-lg">
                    Loạt sút luân lưu
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6 space-y-4">
                {!matchId && (
                    <p className="text-sm text-muted-foreground">
                        Chưa có trận đấu để điều khiển penalty.
                    </p>
                )}

                {error && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}

                <div className="grid grid-cols-2 items-center gap-3 rounded-2xl border bg-muted/30 px-3 py-3 sm:px-4 sm:py-4">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            {homeName}
                        </span>
                        <span
                            className="h-1.5 w-10 rounded-sm"
                            style={{
                                backgroundColor: homeColor ?? 'transparent',
                            }}
                            aria-hidden
                        />
                        <span className="text-3xl font-semibold">
                            {homePenalty}
                        </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 border-l border-border pl-3 sm:pl-4">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            {awayName}
                        </span>
                        <span
                            className="h-1.5 w-10 rounded-sm"
                            style={{
                                backgroundColor: awayColor ?? 'transparent',
                            }}
                            aria-hidden
                        />
                        <span className="text-3xl font-semibold">
                            {awayPenalty}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                            {homeName}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 w-full text-lg"
                                onClick={() => updatePenalty('home', -1)}
                                disabled={
                                    !matchId || isSubmitting || homePenalty <= 0
                                }
                            >
                                −
                            </Button>
                            <Button
                                type="button"
                                className="h-11 w-full text-lg"
                                onClick={() => updatePenalty('home', 1)}
                                disabled={!matchId || isSubmitting}
                            >
                                +
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                            {awayName}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 w-full text-lg"
                                onClick={() => updatePenalty('away', -1)}
                                disabled={
                                    !matchId || isSubmitting || awayPenalty <= 0
                                }
                            >
                                −
                            </Button>
                            <Button
                                type="button"
                                className="h-11 w-full text-lg"
                                onClick={() => updatePenalty('away', 1)}
                                disabled={!matchId || isSubmitting}
                            >
                                +
                            </Button>
                        </div>
                    </div>
                </div>

                {isSubmitting && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="size-4" /> Đang cập nhật…
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
