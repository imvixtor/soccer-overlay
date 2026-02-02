import { useEffect, useState } from 'react';
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import type { OverlayControlRow } from '@/services/control.api';
import { upsertOverlayControl } from '@/services/control.api';

interface OverlayControlPanelProps {
    userId: string;
    initialControl: OverlayControlRow | null;
}

export default function OverlayControlPanel({
    userId,
    initialControl,
}: OverlayControlPanelProps) {
    const [control, setControl] = useState<OverlayControlRow | null>(
        initialControl,
    );
    const [isSaving, setIsSaving] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const overlayUrl =
        typeof window !== 'undefined'
            ? `${window.location.origin}/overlay/${userId}`
            : '';

    const copyOverlayUrl = async () => {
        if (!overlayUrl) return;
        try {
            await navigator.clipboard.writeText(overlayUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    };

    // Đồng bộ lại khi loader revalidate
    useEffect(() => {
        setControl(initialControl);
        setHasInitialized(true);
    }, [initialControl]);

    useEffect(() => {
        if (!success) return;
        const id = window.setTimeout(() => setSuccess(null), 2500);
        return () => window.clearTimeout(id);
    }, [success]);

    const disabled = !hasInitialized || isSaving;

    const updateControl = async (
        updates: Partial<
            Pick<
                OverlayControlRow,
                | 'match_status_enable'
                | 'lineup_enable'
                | 'scorebug_enable'
                | 'clock_enable'
                | 'away_lineup'
            >
        >,
    ) => {
        if (!userId) return;

        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const base: OverlayControlRow = control ?? {
                id: 0,
                user_id: userId,
                match_status_enable: false,
                lineup_enable: false,
                scorebug_enable: true,
                clock_enable: true,
                away_lineup: false,
            };

            const next: OverlayControlRow = {
                ...base,
                ...updates,
            };

            const { data, error } = await upsertOverlayControl(userId, next);
            if (error) {
                // eslint-disable-next-line no-console
                console.error('update overlay_control error', error);
                setError('Không thể lưu cấu hình overlay. Vui lòng thử lại.');
                return;
            }
            setControl(data);
            setSuccess('Đã cập nhật cấu hình overlay.');
        } finally {
            setIsSaving(false);
        }
    };

    const current = control ?? {
        match_status_enable: false,
        lineup_enable: false,
        scorebug_enable: true,
        clock_enable: true,
        away_lineup: false,
        id: 0,
        user_id: userId,
    };

    const isLineupHomeActive = current.lineup_enable && !current.away_lineup;
    const isLineupAwayActive = current.lineup_enable && current.away_lineup;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b pb-4">
                <div className="space-y-1">
                    <CardTitle>Điều khiển Overlay</CardTitle>
                    <CardDescription>
                        Bật/tắt nhanh các phần tử overlay. Chỉ được bật{' '}
                        <strong>Trạng thái</strong> hoặc{' '}
                        <strong>Đội hình</strong> tại một thời điểm.
                    </CardDescription>
                </div>
                <CardAction className="flex items-center gap-2">
                    {isSaving && <Spinner className="size-4" />}
                    {success && (
                        <span className="text-xs text-green-600">
                            {success}
                        </span>
                    )}
                    {error && (
                        <span className="text-xs text-destructive max-w-[220px] text-right">
                            {error}
                        </span>
                    )}
                </CardAction>
            </CardHeader>
            <CardContent className="py-5 space-y-6">
                {/* URL overlay - mọi người có thể truy cập xem overlay qua link này */}
                <div className="space-y-2">
                    <p className="text-sm font-medium">
                        URL Overlay (công khai)
                    </p>
                    <div className="flex gap-2">
                        <Input
                            readOnly
                            value={overlayUrl}
                            className="font-mono text-sm"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={copyOverlayUrl}
                            title="Sao chép URL"
                        >
                            {copied ? (
                                <Check className="size-4 text-green-600" />
                            ) : (
                                <Copy className="size-4" />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Copy URL và thêm vào OBS/Streamlabs để hiển thị overlay.
                        Ai có link đều có thể xem overlay bạn đang điều khiển.
                    </p>
                </div>

                {!hasInitialized ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="size-4" />
                        Đang tải cấu hình overlay…
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Button
                                type="button"
                                variant={
                                    current.clock_enable ? 'default' : 'outline'
                                }
                                aria-pressed={current.clock_enable}
                                disabled={disabled}
                                className="justify-between"
                                onClick={() =>
                                    updateControl({
                                        clock_enable: !current.clock_enable,
                                    })
                                }
                            >
                                <span>Bật đồng hồ</span>
                            </Button>

                            <Button
                                type="button"
                                variant={
                                    current.scorebug_enable
                                        ? 'default'
                                        : 'outline'
                                }
                                aria-pressed={current.scorebug_enable}
                                disabled={disabled}
                                className="justify-between"
                                onClick={() =>
                                    updateControl({
                                        scorebug_enable:
                                            !current.scorebug_enable,
                                    })
                                }
                            >
                                <span>Bật score bug</span>
                            </Button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <Button
                                type="button"
                                variant={
                                    current.match_status_enable
                                        ? 'default'
                                        : 'outline'
                                }
                                aria-pressed={current.match_status_enable}
                                disabled={disabled}
                                className="justify-between"
                                onClick={() =>
                                    updateControl({
                                        match_status_enable:
                                            !current.match_status_enable,
                                        ...(current.match_status_enable
                                            ? {}
                                            : { lineup_enable: false }),
                                    })
                                }
                            >
                                <span>Bật match status</span>
                            </Button>

                            <Button
                                type="button"
                                variant={
                                    isLineupHomeActive ? 'default' : 'outline'
                                }
                                aria-pressed={isLineupHomeActive}
                                disabled={disabled}
                                className="justify-between"
                                onClick={() => {
                                    if (isLineupHomeActive) {
                                        void updateControl({
                                            lineup_enable: false,
                                        });
                                    } else {
                                        void updateControl({
                                            match_status_enable: false,
                                            lineup_enable: true,
                                            away_lineup: false,
                                        });
                                    }
                                }}
                            >
                                <span>Bật lineup đội nhà</span>
                            </Button>

                            <Button
                                type="button"
                                variant={
                                    isLineupAwayActive ? 'default' : 'outline'
                                }
                                aria-pressed={isLineupAwayActive}
                                disabled={disabled}
                                className="justify-between"
                                onClick={() => {
                                    if (isLineupAwayActive) {
                                        void updateControl({
                                            lineup_enable: false,
                                        });
                                    } else {
                                        void updateControl({
                                            match_status_enable: false,
                                            lineup_enable: true,
                                            away_lineup: true,
                                        });
                                    }
                                }}
                            >
                                <span>Bật lineup đội khách</span>
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
