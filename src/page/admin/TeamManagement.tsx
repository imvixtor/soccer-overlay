import { useLoaderData, useRevalidator } from 'react-router';
import { useRef, useState } from 'react';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type TeamRow = Tables<'teams'>;

export default function TeamManagementPage() {
    const { teams, user } = useLoaderData() as {
        teams: TeamRow[];
        user: { id: string } | null;
    };
    const { revalidate } = useRevalidator();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const deleteDialogRef = useRef<HTMLDialogElement>(null);

    const [editing, setEditing] = useState<TeamRow | null>(null);
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [coach, setCoach] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [deletingTeam, setDeletingTeam] = useState<TeamRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const openAdd = () => {
        setEditing(null);
        setName('');
        setShortName('');
        setCoach('');
        setError(null);
        dialogRef.current?.showModal();
    };

    const openEdit = (t: TeamRow) => {
        setEditing(t);
        setName(t.name);
        setShortName(t.short_name);
        setCoach(t.coach ?? '');
        setError(null);
        dialogRef.current?.showModal();
    };

    const closeDialog = () => {
        dialogRef.current?.close();
    };

    const openDeleteConfirm = (t: TeamRow) => {
        setDeletingTeam(t);
        setDeleteError(null);
        deleteDialogRef.current?.showModal();
    };

    const closeDeleteDialog = () => {
        deleteDialogRef.current?.close();
        setDeletingTeam(null);
        setDeleteError(null);
    };

    const confirmDelete = async () => {
        if (!user || !deletingTeam) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            const { error: err } = await supabase
                .from('teams')
                .delete()
                .eq('id', deletingTeam.id)
                .eq('user_id', user.id);
            if (err) throw err;
            closeDeleteDialog();
            revalidate();
        } catch (x) {
            setDeleteError(
                x instanceof Error ? x.message : 'Something went wrong',
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setError(null);
        setIsSubmitting(true);

        try {
            if (editing) {
                const patch: TablesUpdate<'teams'> = {
                    name: name.trim(),
                    short_name: shortName.trim(),
                    coach: coach.trim() || null,
                };
                const { error: err } = await supabase
                    .from('teams')
                    .update(patch)
                    .eq('id', editing.id)
                    .eq('user_id', user.id);
                if (err) throw err;
            } else {
                const row: TablesInsert<'teams'> = {
                    user_id: user.id,
                    name: name.trim(),
                    short_name: shortName.trim(),
                    coach: coach.trim() || null,
                };
                const { error: err } = await supabase.from('teams').insert(row);
                if (err) throw err;
            }
            closeDialog();
            revalidate();
        } catch (x) {
            setError(x instanceof Error ? x.message : 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className={cn(
                'flex flex-col gap-4 sm:gap-5',
                'max-w-xl mx-auto',
                'pb-20',
            )}
        >
            <h1 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
                Teams
            </h1>

            {teams.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                    No teams yet. Add your first team.
                </p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {teams.map((t) => (
                        <li key={t.id}>
                            <div
                                className={cn(
                                    'flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm',
                                )}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-foreground">
                                        {t.name}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                        <span
                                            className={cn(
                                                'inline-flex shrink-0 items-center justify-center',
                                                'w-12 rounded px-2 py-0.5 text-xs font-medium',
                                                'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {t.short_name}
                                        </span>
                                        {t.coach && (
                                            <span className="text-xs text-muted-foreground">
                                                Coach: {t.coach}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {user && (
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => openEdit(t)}
                                            aria-label="Edit"
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => openDeleteConfirm(t)}
                                            aria-label="Delete"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {user && (
                <Button
                    onClick={openAdd}
                    className={cn(
                        'fixed bottom-24 right-4 z-40 size-14 rounded-full shadow-lg',
                        'sm:right-6',
                    )}
                    size="icon"
                    aria-label="Add team"
                >
                    <Plus className="size-6" />
                </Button>
            )}

            <dialog
                ref={dialogRef}
                className={cn(
                    'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                    'w-full max-w-[calc(100vw-2rem)] sm:max-w-md',
                    'max-h-[85vh] overflow-y-auto',
                    'rounded-2xl border bg-card p-0 shadow-2xl',
                    'backdrop:bg-black/60 backdrop:backdrop-blur-sm',
                )}
                onCancel={closeDialog}
            >
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <CardHeader className="shrink-0 px-4 pt-5 pb-1 sm:px-6 sm:pt-6">
                        <CardTitle className="text-lg sm:text-xl">
                            {editing ? 'Edit team' : 'Add team'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-4 pb-6 pt-1 sm:px-6">
                        {error && (
                            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {error}
                            </p>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="team-name">Name</Label>
                            <Input
                                id="team-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Manchester United"
                                required
                                className="h-10"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="team-short">Short name</Label>
                            <Input
                                id="team-short"
                                value={shortName}
                                onChange={(e) => setShortName(e.target.value)}
                                placeholder="e.g. MUN"
                                required
                                className="h-10"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="team-coach">Coach (optional)</Label>
                            <Input
                                id="team-coach"
                                value={coach}
                                onChange={(e) => setCoach(e.target.value)}
                                placeholder="e.g. John Smith"
                                className="h-10"
                            />
                        </div>
                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-2 sm:pt-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeDialog}
                                className="h-10 w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-10 w-full gap-2 sm:w-auto"
                            >
                                {isSubmitting ? (
                                    <Spinner className="size-4" />
                                ) : null}
                                {editing ? 'Save' : 'Add'}
                            </Button>
                        </div>
                    </CardContent>
                </form>
            </dialog>

            <dialog
                ref={deleteDialogRef}
                className={cn(
                    'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                    'w-full max-w-[calc(100vw-2rem)] sm:max-w-sm',
                    'rounded-2xl border bg-card p-0 shadow-2xl',
                    'backdrop:bg-black/60 backdrop:backdrop-blur-sm',
                )}
                onCancel={closeDeleteDialog}
            >
                <CardHeader className="shrink-0 px-4 pt-5 pb-1 sm:px-6 sm:pt-6">
                    <CardTitle className="text-lg sm:text-xl">
                        Delete team?
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-4 pb-6 pt-1 sm:px-6">
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete{' '}
                        <span className="font-medium text-foreground">
                            {deletingTeam?.name ?? 'this team'}
                        </span>
                        ? This action cannot be undone.
                    </p>
                    {deleteError && (
                        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {deleteError}
                        </p>
                    )}
                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-2 sm:pt-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={closeDeleteDialog}
                            disabled={isDeleting}
                            className="h-10 w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmDelete}
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
        </div>
    );
}
