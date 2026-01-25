import {
    useLoaderData,
    useRevalidator,
    useSearchParams,
    useNavigate,
} from 'react-router';
import { useRef, useState, useCallback } from 'react';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';
import type { TeamsLoaderData } from '@/types/loader';
import type { Tables } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/error-utils';
import { downloadCsv } from '@/lib/download';
import { parseTeamsCsv, TEAMS_CSV_TEMPLATE } from '@/lib/csv/teams';
import { AddFab } from '@/components/admin/AddFab';
import { CsvImportBlock } from '@/components/admin/CsvImportBlock';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { EntityListCard } from '@/components/admin/EntityListCard';
import { PaginationBar } from '@/components/admin/PaginationBar';
import { usePaginationRedirect } from '@/hooks/usePaginationRedirect';
import { useImportSuccessFlash } from '@/hooks/useImportSuccessFlash';
import * as teamsApi from '@/services/teams.api';

type TeamRow = Tables<'teams'>;

export default function TeamManagementPage() {
    const { teams, totalCount, totalPages, page, user } =
        useLoaderData() as TeamsLoaderData;
    const { revalidate } = useRevalidator();
    const [, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
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

    usePaginationRedirect(page, totalPages);
    useImportSuccessFlash(
        importSuccess,
        useCallback(() => setImportSuccess(null), []),
    );

    const closeDialog = useCallback(() => dialogRef.current?.close(), []);
    const clearImportFlash = useCallback(() => {
        setImportError(null);
        setImportSuccess(null);
    }, []);

    const openAdd = () => {
        setEditing(null);
        setName('');
        setShortName('');
        setCoach('');
        setError(null);
        clearImportFlash();
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
            await teamsApi.deleteTeam(deletingTeam.id, user.id);
            closeDeleteDialog();
            revalidate();
        } catch (e) {
            setDeleteError(getErrorMessage(e));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        e.target.value = '';
        setImportError(null);
        setImportSuccess(null);
        setIsImporting(true);
        try {
            const text = await file.text();
            const data = parseTeamsCsv(text, user.id);
            if (data.length === 0) {
                setImportError(
                    'No valid rows. Each row needs name and short_name.',
                );
                return;
            }
            await teamsApi.importTeams(data);
            setImportSuccess(data.length);
            revalidate();
            closeDialog();
        } catch (e) {
            setImportError(getErrorMessage(e, 'Import failed.'));
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadTemplate = () =>
        downloadCsv(TEAMS_CSV_TEMPLATE, 'teams-template.csv');

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
                await teamsApi.updateTeam(editing.id, user.id, patch);
            } else {
                const row: TablesInsert<'teams'> = {
                    user_id: user.id,
                    name: name.trim(),
                    short_name: shortName.trim(),
                    coach: coach.trim() || null,
                };
                await teamsApi.createTeam(row);
            }
            closeDialog();
            revalidate();
        } catch (e) {
            setError(getErrorMessage(e));
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
                        {teams.map((t) => (
                            <li key={t.id}>
                                <EntityListCard
                                    title={t.name}
                                    badge={t.short_name}
                                    extra={
                                        t.coach
                                            ? `Coach: ${t.coach}`
                                            : undefined
                                    }
                                    onPlayers={() =>
                                        navigate(
                                            `/admin/players?team=${t.id}`,
                                        )
                                    }
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
                            setSearchParams({ page: String(currentPage - 1) })
                        }
                        onNext={() =>
                            setSearchParams({ page: String(currentPage + 1) })
                        }
                    />
                </>
            )}

            {user && <AddFab onClick={openAdd} aria-label="Add team" />}

            <dialog
                ref={dialogRef}
                className={cn(
                    'fixed top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2',
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
                        {!editing && (
                            <CsvImportBlock
                                fileInputRef={fileInputRef}
                                onFileChange={handleFileSelect}
                                onImportClick={() =>
                                    fileInputRef.current?.click()
                                }
                                onTemplateClick={handleDownloadTemplate}
                                isImporting={isImporting}
                                importError={importError}
                                importSuccess={importSuccess}
                                itemLabel="team"
                            />
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
