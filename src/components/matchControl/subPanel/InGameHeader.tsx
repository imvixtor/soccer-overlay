import type { MatchPhase } from '@/lib/match-constants';
import type { MatchWithTeams } from '@/services/matches.api';

interface InGameHeaderProps {
    phase: MatchPhase;
    match: MatchWithTeams | null;
    matchTime: string;
}

export function InGameHeader({ phase, match, matchTime }: InGameHeaderProps) {
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
    );
}
