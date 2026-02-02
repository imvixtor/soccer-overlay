import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MatchWithTeams } from '@/services/matches.api';
import type { MatchConfigRow } from '@/services/match-config.api';
import type { TeamOption } from '@/types/loader';
import { createMatch, updateMatch } from '@/services/matches.api';
import { upsertMatchConfig } from '@/services/match-config.api';
import { Spinner } from '@/components/ui/spinner';

interface InitiationPanelProps {
    match: MatchWithTeams | null;
    matchConfig: MatchConfigRow | null;
    teams: TeamOption[];
    userId: string;
    onMatchUpdated?: () => void;
}

export default function InitiationPanel({
    match,
    matchConfig,
    teams,
    userId,
    onMatchUpdated,
}: InitiationPanelProps) {
    const [homeTeamId, setHomeTeamId] = useState<string>(
        match?.home_team?.toString() ?? '',
    );
    const [awayTeamId, setAwayTeamId] = useState<string>(
        match?.away_team?.toString() ?? '',
    );
    const [matchName, setMatchName] = useState<string>(match?.name ?? '');
    const [halfDuration, setHalfDuration] = useState<number>(
        matchConfig?.half_duration ?? 45,
    );
    const [extraDuration, setExtraDuration] = useState<number>(
        matchConfig?.extra_duration ?? 0,
    );
    const [hasPenaltyShootout, setHasPenaltyShootout] = useState<boolean>(
        matchConfig?.has_penalty_shootout ?? false,
    );
    const [playersPerTeam, setPlayersPerTeam] = useState<number>(
        matchConfig?.players_per_team ?? 11,
    );
    const [homeColor, setHomeColor] = useState<string>(
        match?.home_color ?? '#ffffff',
    );
    const [awayColor, setAwayColor] = useState<string>(
        match?.away_color ?? '#000000',
    );

    const homeTeamLabel =
        teams.find((t) => String(t.id) === homeTeamId)?.short_name ||
        teams.find((t) => String(t.id) === homeTeamId)?.name ||
        'Đội nhà';
    const awayTeamLabel =
        teams.find((t) => String(t.id) === awayTeamId)?.short_name ||
        teams.find((t) => String(t.id) === awayTeamId)?.name ||
        'Đội khách';

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Đồng bộ state khi match hoặc matchConfig thay đổi
    useEffect(() => {
        if (match) {
            setHomeTeamId(match.home_team?.toString() ?? '');
            setAwayTeamId(match.away_team?.toString() ?? '');
            setMatchName(match.name ?? '');
            setHomeColor(match.home_color ?? '#ffffff');
            setAwayColor(match.away_color ?? '#000000');
        }
        if (matchConfig) {
            setHalfDuration(matchConfig.half_duration);
            setExtraDuration(matchConfig.extra_duration ?? 0);
            setHasPenaltyShootout(matchConfig.has_penalty_shootout);
            setPlayersPerTeam(matchConfig.players_per_team);
        }
    }, [match, matchConfig]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        try {
            // Validate
            if (!homeTeamId || !awayTeamId) {
                setError('Vui lòng chọn cả hai đội thi đấu');
                setIsSubmitting(false);
                return;
            }

            if (homeTeamId === awayTeamId) {
                setError('Hai đội thi đấu phải khác nhau');
                setIsSubmitting(false);
                return;
            }

            if (halfDuration <= 0) {
                setError('Thời lượng một hiệp phải lớn hơn 0');
                setIsSubmitting(false);
                return;
            }

            if (extraDuration < 0) {
                setError('Thời lượng hiệp phụ không được âm');
                setIsSubmitting(false);
                return;
            }

            if (playersPerTeam <= 0) {
                setError('Số cầu thủ mỗi đội phải lớn hơn 0');
                setIsSubmitting(false);
                return;
            }

            // Cập nhật match config
            const configResult = await upsertMatchConfig(userId, {
                half_duration: halfDuration,
                extra_duration: extraDuration,
                has_penalty_shootout: hasPenaltyShootout,
                players_per_team: playersPerTeam,
            });

            if (configResult.error) {
                throw configResult.error;
            }

            // Tạo hoặc cập nhật match
            if (match?.id) {
                // Cập nhật match hiện có
                const matchResult = await updateMatch(match.id, {
                    home_team: parseInt(homeTeamId),
                    away_team: parseInt(awayTeamId),
                    name: matchName || null,
                    home_color: homeColor,
                    away_color: awayColor,
                });

                if (matchResult.error) {
                    throw matchResult.error;
                }
            } else {
                // Tạo match mới
                const matchResult = await createMatch({
                    user_id: userId,
                    home_team: parseInt(homeTeamId),
                    away_team: parseInt(awayTeamId),
                    name: matchName || null,
                    home_color: homeColor,
                    away_color: awayColor,
                });

                if (matchResult.error) {
                    throw matchResult.error;
                }
            }

            setSuccess('Đã lưu cấu hình trận đấu thành công');
            onMatchUpdated?.();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="rounded-2xl">
            <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3">
                <CardTitle className="text-base sm:text-lg">
                    Cấu hình trận đấu
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-5 pt-0 sm:px-6 sm:pb-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Chọn đội thi đấu */}
                    <div className="space-y-3">
                        {/* Error và Success messages */}
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
                                <Label htmlFor="home-team">Đội nhà</Label>
                                <select
                                    id="home-team"
                                    value={homeTeamId}
                                    onChange={(e) =>
                                        setHomeTeamId(e.target.value)
                                    }
                                    className={cn(
                                        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                        'disabled:cursor-not-allowed disabled:opacity-50',
                                    )}
                                    disabled={isSubmitting}
                                >
                                    <option value="">-- Chọn đội nhà --</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name} ({team.short_name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="away-team">Đội khách</Label>
                                <select
                                    id="away-team"
                                    value={awayTeamId}
                                    onChange={(e) =>
                                        setAwayTeamId(e.target.value)
                                    }
                                    className={cn(
                                        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                        'disabled:cursor-not-allowed disabled:opacity-50',
                                    )}
                                    disabled={isSubmitting}
                                >
                                    <option value="">
                                        -- Chọn đội khách --
                                    </option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name} ({team.short_name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Màu áo */}
                    <div className="space-y-2">
                        <Label>Màu áo</Label>
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
                                    onChange={(e) =>
                                        setHomeColor(e.target.value)
                                    }
                                    disabled={isSubmitting}
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
                                    onChange={(e) =>
                                        setAwayColor(e.target.value)
                                    }
                                    disabled={isSubmitting}
                                    aria-label="Màu áo đội khách"
                                    className="h-8 w-9 shrink-0 rounded-md border bg-background p-1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tên trận đấu */}
                    <div className="space-y-2">
                        <Label htmlFor="match-name">
                            Tên trận đấu (tùy chọn)
                        </Label>
                        <Input
                            id="match-name"
                            type="text"
                            value={matchName}
                            onChange={(e) => setMatchName(e.target.value)}
                            placeholder="Ví dụ: Chung kết giải đấu..."
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Cấu hình trận đấu */}
                    <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="half-duration">
                                    Thời lượng một hiệp (phút)
                                </Label>
                                <Input
                                    id="half-duration"
                                    type="number"
                                    min="1"
                                    value={halfDuration}
                                    onChange={(e) =>
                                        setHalfDuration(
                                            parseInt(e.target.value) || 0,
                                        )
                                    }
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="extra-duration">
                                    Thời lượng hiệp phụ (phút)
                                </Label>
                                <Input
                                    id="extra-duration"
                                    type="number"
                                    min="0"
                                    value={extraDuration}
                                    onChange={(e) =>
                                        setExtraDuration(
                                            parseInt(e.target.value) || 0,
                                        )
                                    }
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="players-per-team">
                                    Số cầu thủ mỗi đội
                                </Label>
                                <Input
                                    id="players-per-team"
                                    type="number"
                                    min="1"
                                    value={playersPerTeam}
                                    onChange={(e) =>
                                        setPlayersPerTeam(
                                            parseInt(e.target.value) || 0,
                                        )
                                    }
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="penalty-shootout">
                                    Thi đấu penalty
                                </Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        id="penalty-shootout"
                                        type="checkbox"
                                        checked={hasPenaltyShootout}
                                        onChange={(e) =>
                                            setHasPenaltyShootout(
                                                e.target.checked,
                                            )
                                        }
                                        disabled={isSubmitting}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <label
                                        htmlFor="penalty-shootout"
                                        className="text-sm text-muted-foreground"
                                    >
                                        Bật/tắt
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit button */}
                    <div className="flex flex-col sm:flex-row sm:justify-end">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto"
                        >
                            {isSubmitting ? (
                                <>
                                    <Spinner className="mr-2 size-4" />
                                    Đang lưu...
                                </>
                            ) : (
                                'Lưu cấu hình'
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
