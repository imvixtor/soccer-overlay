import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type EntityListCardProps = {
    title: React.ReactNode;
    badge?: string | null;
    extra?: React.ReactNode;
    onEdit?: () => void;
    onDelete?: () => void;
    showActions: boolean;
};

export function EntityListCard({
    title,
    badge,
    extra,
    onEdit,
    onDelete,
    showActions,
}: EntityListCardProps) {
    return (
        <div
            className={cn(
                'flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm',
            )}
        >
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {badge && (
                        <span
                            className={cn(
                                'inline-flex shrink-0 items-center justify-center',
                                'w-12 rounded px-2 py-0.5 text-xs font-medium',
                                'bg-muted text-muted-foreground',
                            )}
                        >
                            {badge}
                        </span>
                    )}
                    {extra && (
                        <span className="text-xs text-muted-foreground">
                            {extra}
                        </span>
                    )}
                </div>
            </div>
            {showActions && (
                <div className="flex shrink-0 items-center gap-1">
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onEdit}
                            aria-label="Edit"
                        >
                            <Pencil className="size-4" />
                        </Button>
                    )}
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onDelete}
                            aria-label="Delete"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
