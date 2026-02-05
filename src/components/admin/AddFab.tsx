import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type AddFabVariant = 'add' | 'delete' | 'transfer';

type AddFabProps = {
    onClick: () => void;
    'aria-label': string;
    variant?: AddFabVariant;
    className?: string;
};

export function AddFab({
    onClick,
    'aria-label': ariaLabel,
    variant = 'add',
    className,
}: AddFabProps) {
    const Icon =
        variant === 'delete' ? Trash2 : variant === 'transfer' ? ArrowLeftRight : Plus;
    const buttonVariant = variant === 'delete' ? 'destructive' : 'default';

    return (
        <Button
            onClick={onClick}
            className={cn(
                'fixed bottom-24 right-4 z-40 size-14 rounded-full shadow-lg',
                'sm:right-6',
                className,
            )}
            size="icon"
            variant={buttonVariant as 'default' | 'destructive'}
            aria-label={ariaLabel}
        >
            <Icon className="size-6" />
        </Button>
    );
}
