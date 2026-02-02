import { useState } from 'react';
import { ChevronRight, LayoutDashboard, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    getBreadcrumbPhases,
    getNextPhase,
    PHASE_LABELS,
    type MatchPhase,
} from '@/lib/match-constants';
import MatchControlPanel from '@/components/matchControl/matchControlPanel';
import OverlayControlPanel from '@/components/matchControl/overlayControlPanel';

const DEFAULT_PHASE: MatchPhase = 'INITIATION';

type ViewMode = 'match' | 'overlay';

export default function MatchControlPage() {
    const [phase, setPhase] = useState<MatchPhase>(DEFAULT_PHASE);
    const [viewMode, setViewMode] = useState<ViewMode>('match');

    const breadcrumbPhases = getBreadcrumbPhases(phase);
    const next = getNextPhase(phase);

    const handleNextPhase = () => {
        const n = getNextPhase(phase);
        if (n) setPhase(n);
    };

    const handleEndMatch = () => {
        setPhase('POST_MATCH');
        // TODO: call updateMatchPhase(matchId, 'POST_MATCH') when matchId is available
    };

    const handleResetMatch = () => {
        setPhase('INITIATION');
        // TODO: call updateMatchPhase(matchId, 'POST_MATCH') when matchId is available
    };

    return (
        <div className="space-y-4">
            <h1 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
                Match Control
            </h1>

            {/* View switcher: Match panel | Overlay panel */}
            <div className="flex justify-center">
                <div
                    role="tablist"
                    aria-label="Switch between Match panel and Overlay panel"
                    className="inline-flex rounded-lg border bg-muted/50 p-1"
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('match')}
                        aria-pressed={viewMode === 'match'}
                        aria-selected={viewMode === 'match'}
                        role="tab"
                        className={cn(
                            'gap-2',
                            viewMode === 'match' &&
                                'bg-background text-foreground shadow-sm border',
                        )}
                    >
                        <LayoutDashboard className="size-4" />
                        Match panel
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('overlay')}
                        aria-pressed={viewMode === 'overlay'}
                        aria-selected={viewMode === 'overlay'}
                        role="tab"
                        className={cn(
                            'gap-2',
                            viewMode === 'overlay' &&
                                'bg-background text-foreground shadow-sm border',
                        )}
                    >
                        <Monitor className="size-4" />
                        Overlay panel
                    </Button>
                </div>
            </div>

            {/* Breadcrumb: last 3 phases */}
            <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5 text-sm justify-center"
            >
                {breadcrumbPhases.map((p, i) => (
                    <span key={p} className="flex items-center gap-1.5">
                        {i > 0 && (
                            <ChevronRight
                                className="size-4 shrink-0 text-muted-foreground"
                                aria-hidden
                            />
                        )}
                        <span
                            className={
                                p === phase
                                    ? 'font-medium text-foreground'
                                    : 'text-muted-foreground'
                            }
                        >
                            {PHASE_LABELS[p]}
                        </span>
                    </span>
                ))}
            </nav>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 justify-between">
                {phase == 'POST_MATCH' ? (
                    <Button variant="destructive" onClick={handleResetMatch}>
                        Reset
                    </Button>
                ) : (
                    <Button variant="destructive" onClick={handleEndMatch}>
                        End match
                    </Button>
                )}
                <p>00:00</p>
                <Button onClick={handleNextPhase} disabled={!next}>
                    Next phase
                </Button>
            </div>

            {/* Content: Match panel or Overlay panel */}
            {viewMode === 'match' ? (
                <MatchControlPanel phase={phase} />
            ) : (
                <OverlayControlPanel />
            )}
        </div>
    );
}
