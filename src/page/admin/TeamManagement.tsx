import { useLoaderData, useRevalidator, useSearchParams } from 'react-router';
import { useRef, useState, useEffect } from 'react';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Upload, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseCSV } from '@/lib/parse-csv';
import { AddFab } from '@/components/admin/AddFab';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { EntityListCard } from '@/components/admin/EntityListCard';
import { PaginationBar } from '@/components/admin/PaginationBar';

type TeamRow = Tables<'teams'>;

export default function TeamManagementPage() {
    const { teams, totalCount, totalPages, page, user } = useLoaderData() as {
        teams: TeamRow[];
        totalCount: number;
        totalPages: number;
        page: number;
        user: { id: string } | null;
    };
    const { revalidate } = useRevalidator();
    const [, setSearchParams] = useSearchParams();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editing, setEditing] = useState<TeamRow | null>(null);
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [coach, setCoach] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [deletingTeam, setDeletingTeam] = useState<TeamRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState<number | null>(null);

    const currentPage = Math.min(page, totalPages);

    useEffect(() => {
        if (totalPages >= 1 && page > totalPages) {
            setSearchParams({ page: String(totalPages) }, { replace: true });
        }
    }, [totalPages, page, setSearchParams]);

    useEffect(() => {
        if (importSuccess === null) return;
        const t = setTimeout(() => setImportSuccess(null), 4000);
        return () => clearTimeout(t);
    }, [importSuccess]);

    const openAdd = () => {
        setEditing(null);
        setName('');
        setShortName('');
        setCoach('');
        setError(null);
        setImportError(null);
        setImportSuccess(null);
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
    };

    const closeDeleteDialog = () => {
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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setImportError(null);
        setImportSuccess(null);
        setIsImporting(true);
        e.target.value = '';

        try {
            const text = await file.text();
            const rows = parseCSV(text);
            const isHeader =
                rows[0] &&
                /^(name|short_name|short name|coach)$/i.test(
                    String(rows[0][0] ?? '').trim(),
                );
            const data = (isHeader ? rows.slice(1) : rows)
                .filter((r) => (r[0]?.trim() ?? '') && (r[1]?.trim() ?? ''))
                .map(
                    (r): TablesInsert<'teams'> => ({
                        user_id: user.id,
                        name: String(r[0] ?? '').trim(),
                        short_name: String(r[1] ?? '').trim(),
                        coach: (r[2]?.trim() ?? '') || null,
                    }),
                );

            if (data.length === 0) {
                setImportError(
                    'No valid rows. Each row needs name and short_name.',
                );
                return;
            }

            const { error: err } = await supabase.from('teams').insert(data);
            if (err) throw err;
            setImportSuccess(data.length);
            revalidate();
            closeDialog();
        } catch (x) {
            setImportError(x instanceof Error ? x.message : 'Import failed.');
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        const csv =
            'name,short_name,coach\nManchester United,MUN,Alex Ferguson\nReal Madrid,RMA,\n';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'teams-template.csv';
        a.click();
        URL.revokeObjectURL(url);
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
        <div className={cn('flex flex-col gap-4 sm:gap-5', 'max-w-xl mx-auto')}>
            <h1 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
                Teams
            </h1>

            {totalCount === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                    No teams yet. Add your first team.
                </p>
            ) : (
                <>
                    <ul className="flex flex-col gap-3">
                        {teams.map((t: TeamRow) => (
                            <li key={t.id}>
                                <EntityListCard
                                    title={t.name}
                                    badge={t.short_name}
                                    extra={t.coach ? `Coach: ${t.coach}` : undefined}
                                    onEdit={() => openEdit(t)}
                                    onDelete={() => openDeleteConfirm(t)}
                                    showActions={!!user}
                                />
                            </li>
                        ))}
                    </ul>

                    <PaginationBar
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        itemLabel="team"
                        onPrev={() =>
                            setSearchParams({
                                page: String(currentPage - 1),
                            })
                        }
                        onNext={() =>
                            setSearchParams({
                                page: String(currentPage + 1),
                            })
                        }
                    />
                </>
            )}

            {user && (
                <AddFab onClick={openAdd} aria-label="Add team" />
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
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        {error && (
                            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {error}
                            </p>
                        )}
                        {!editing && (
                            <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-3">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Import from CSV
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        disabled={isImporting}
                                        className="gap-2 w-full"
                                    >
                                        {isImporting ? (
                                            <Spinner className="size-4" />
                                        ) : (
                                            <Upload className="size-4" />
                                        )}
                                        Import CSV
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadTemplate}
                                        className="gap-2 w-full"
                                    >
                                        <Download className="size-4" />
                                        Template
                                    </Button>
                                </div>
                                {importError && (
                                    <p className="text-sm text-destructive">
                                        {importError}
                                    </p>
                                )}
                                {importSuccess !== null && (
                                    <p className="text-sm text-primary">
                                        Imported {importSuccess} team
                                        {importSuccess !== 1 ? 's' : ''}.
                                    </p>
                                )}
                            </div>
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

            <DeleteConfirmDialog
                open={!!deletingTeam}
                onClose={closeDeleteDialog}
                title="Delete team?"
                itemName={deletingTeam?.name ?? 'this team'}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
                error={deleteError}
            />
        </div>
    );
}
