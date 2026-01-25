import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type PaginationBarProps = {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    itemLabel: string;
    onPrev: () => void;
    onNext: () => void;
};

export function PaginationBar({
    currentPage,
    totalPages,
    totalCount,
    itemLabel,
    onPrev,
    onNext,
}: PaginationBarProps) {
    return (
        <div className="flex flex-col items-center gap-3 py-4 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
                <span className="ml-1.5">
                    ({totalCount} {itemLabel}
                    {totalCount !== 1 ? 's' : ''})
                </span>
            </p>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrev}
                    disabled={currentPage <= 1}
                    className="gap-1"
                >
                    <ChevronLeft className="size-4" />
                    Prev
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onNext}
                    disabled={currentPage >= totalPages}
                    className="gap-1"
                >
                    Next
                    <ChevronRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}
