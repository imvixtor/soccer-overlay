import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type AddFabProps = {
    onClick: () => void;
    'aria-label': string;
};

export function AddFab({ onClick, 'aria-label': ariaLabel }: AddFabProps) {
    return (
        <Button
            onClick={onClick}
            className={cn(
                'fixed bottom-24 right-4 z-40 size-14 rounded-full shadow-lg',
                'sm:right-6',
            )}
            size="icon"
            aria-label={ariaLabel}
        >
            <Plus className="size-6" />
        </Button>
    );
}
