import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type DeleteConfirmDialogProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    itemName: string;
    onConfirm: () => void;
    isDeleting: boolean;
    error: string | null;
};

export function DeleteConfirmDialog({
    open,
    onClose,
    title,
    itemName,
    onConfirm,
    isDeleting,
    error,
}: DeleteConfirmDialogProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (open) ref.current?.showModal();
        else ref.current?.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            className={cn(
                'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                'w-full max-w-[calc(100vw-2rem)] sm:max-w-sm',
                'rounded-2xl border bg-card p-0 shadow-2xl',
                'backdrop:bg-black/60 backdrop:backdrop-blur-sm',
            )}
            onCancel={onClose}
        >
            <CardHeader className="shrink-0 px-4 pt-5 pb-1 sm:px-6 sm:pt-6">
                <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-6 pt-1 sm:px-6">
                <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete{' '}
                    <span className="font-medium text-foreground">
                        {itemName}
                    </span>
                    ? This action cannot be undone.
                </p>
                {error && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-2 sm:pt-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="h-10 w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="h-10 w-full gap-2 sm:w-auto"
                    >
                        {isDeleting ? (
                            <Spinner className="size-4" />
                        ) : (
                            <Trash2 className="size-4" />
                        )}
                        {isDeleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </CardContent>
        </dialog>
    );
}
