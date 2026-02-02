import { Card, CardContent } from '@/components/ui/card';
import type { MatchPhase } from '@/lib/match-constants';
import InitiationPanel from './subPanel/initiation';
import PreparationPanel from './subPanel/preparation';
import InGamePanel from './subPanel/inGame';
import RestTimePanel from './subPanel/restTime';
import PenaltyShootPanel from './subPanel/penaltyShoot';
import PostMatchPanel from './subPanel/post_match';
import type { MatchWithTeams } from '@/services/matches.api';
import type { MatchConfigRow } from '@/services/match-config.api';
import type { TeamOption } from '@/types/loader';

interface MatchControlPanelProps {
    phase: MatchPhase;
    match: MatchWithTeams | null;
    matchConfig: MatchConfigRow | null;
    teams: TeamOption[];
    userId: string;
    matchTime: string;
    onMatchUpdated?: () => void;
}

export default function MatchControlPanel({
    phase,
    match,
    matchConfig,
    teams,
    userId,
    matchTime,
    onMatchUpdated,
}: MatchControlPanelProps) {
    const halfDuration = matchConfig?.half_duration ?? 45;
    const extraDuration = matchConfig?.extra_duration ?? 15;
    if (phase === 'INITIATION') {
        return (
            <InitiationPanel
                match={match}
                matchConfig={matchConfig}
                teams={teams}
                userId={userId}
                onMatchUpdated={onMatchUpdated}
            />
        );
    }

    if (phase === 'PREPARATION') {
        return (
            <PreparationPanel
                match={match}
                matchConfig={matchConfig}
                userId={userId}
                onMatchUpdated={onMatchUpdated}
            />
        );
    }

    // Rest-time panels (mobile-first) — show live stats similar to post-match
    if (
        phase === 'PRE_MATCH' ||
        phase === 'HALFTIME' ||
        phase === 'FULLTIME' ||
        phase === 'EXTIME_HALF_TIME'
    ) {
        return (
            <RestTimePanel
                phase={phase}
                match={match}
                onMatchUpdated={onMatchUpdated}
            />
        );
    }

    // In-game panels for match halves
    if (
        phase === 'FIRST_HALF' ||
        phase === 'SECOND_HALF' ||
        phase === 'EXTIME_FIRST_HALF' ||
        phase === 'EXTIME_SECOND_HALF'
    ) {
        const currentMinute =
            Number.parseInt(matchTime.split(':')[0] ?? '0', 10) || 0;
        return (
            <InGamePanel
                phase={phase}
                match={match}
                userId={userId}
                currentMinute={currentMinute}
                matchTime={matchTime}
                halfDuration={halfDuration}
                extraDuration={extraDuration}
                onMatchUpdated={onMatchUpdated}
            />
        );
    }

    if (phase === 'PENALTY_SHOOTOUT') {
        return <PenaltyShootPanel match={match} />;
    }

    if (phase === 'POST_MATCH') {
        return <PostMatchPanel match={match} />;
    }

    return (
        <Card>
            <CardContent className="min-h-[200px] py-6">
                <p className="text-muted-foreground">Match panel — {phase}</p>
            </CardContent>
        </Card>
    );
}
