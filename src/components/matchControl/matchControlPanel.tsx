import { Card, CardContent } from '@/components/ui/card';
import type { MatchPhase } from '@/lib/match-constants';

export default function MatchControlPanel({ phase }: { phase: MatchPhase }) {
    return (
        <Card>
            <CardContent className="min-h-[200px] py-6">
                <p className="text-muted-foreground">Match panel — {phase}</p>
            </CardContent>
        </Card>
    );
}
