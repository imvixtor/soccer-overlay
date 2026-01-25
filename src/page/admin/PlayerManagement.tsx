import { useLoaderData, useRevalidator, useSearchParams } from 'react-router';
import { useRef, useState, useCallback } from 'react';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';
import type { PlayersLoaderData, PlayerWithTeam } from '@/types/loader';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn, capitalizeName } from '@/lib/utils';
import { getErrorMessage } from '@/lib/error-utils';
import { downloadCsv } from '@/lib/download';
import { parsePlayersCsv, PLAYERS_CSV_TEMPLATE } from '@/lib/csv/players';
import { AddFab } from '@/components/admin/AddFab';
import { CsvImportBlock } from '@/components/admin/CsvImportBlock';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { EntityListCard } from '@/components/admin/EntityListCard';
import { PaginationBar } from '@/components/admin/PaginationBar';
import { usePaginationRedirect } from '@/hooks/usePaginationRedirect';
import { useImportSuccessFlash } from '@/hooks/useImportSuccessFlash';
import * as playersApi from '@/services/players.api';

export default function PlayerManagementPage() {
    const { players, totalCount, totalPages, page, teams, user } =
        useLoaderData() as PlayersLoaderData;
    const { revalidate } = useRevalidator();
    const [, setSearchParams] = useSearchParams();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editing, setEditing] = useState<PlayerWithTeam | null>(null);
    const [fullName, setFullName] = useState('');
    const [number, setNumber] = useState('');
    const [nickname, setNickname] = useState('');
    const [teamId, setTeamId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [deletingPlayer, setDeletingPlayer] = useState<PlayerWithTeam | null>(
        null,
    );
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
        setFullName('');
        setNumber('');
        setNickname('');
        setTeamId('');
        setError(null);
        clearImportFlash();
        dialogRef.current?.showModal();
    };

    const openEdit = (p: PlayerWithTeam) => {
        setEditing(p);
        setFullName(p.full_name ?? '');
        setNumber(String(p.number));
        setNickname(p.nickname ?? '');
        setTeamId(p.team_id != null ? String(p.team_id) : '');
        setError(null);
        dialogRef.current?.showModal();
    };

    const openDeleteConfirm = (p: PlayerWithTeam) => {
        setDeletingPlayer(p);
        setDeleteError(null);
    };

    const closeDeleteDialog = () => {
        setDeletingPlayer(null);
        setDeleteError(null);
    };

    const confirmDelete = async () => {
        if (!user || !deletingPlayer) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            await playersApi.deletePlayer(deletingPlayer.id, user.id);
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
            const data = parsePlayersCsv(text, teams, user.id);
            if (data.length === 0) {
                setImportError(
                    'No valid rows. Each row needs full_name and number.',
                );
                return;
            }
            await playersApi.importPlayers(data);
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
        downloadCsv(PLAYERS_CSV_TEMPLATE, 'players-template.csv');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setError(null);
        setIsSubmitting(true);
        const num = parseInt(number, 10);
        if (!Number.isFinite(num) || num < 0) {
            setError('Number must be a non‑negative integer.');
            setIsSubmitting(false);
            return;
        }
        try {
            if (editing) {
                const patch: TablesUpdate<'players'> = {
                    full_name: fullName.trim() || null,
                    number: num,
                    nickname: nickname.trim() || null,
                    team_id: teamId ? parseInt(teamId, 10) || null : null,
                };
                await playersApi.updatePlayer(editing.id, user.id, patch);
            } else {
                const row: TablesInsert<'players'> = {
                    user_id: user.id,
                    full_name: fullName.trim() || null,
                    number: num,
                    nickname: nickname.trim() || null,
                    team_id: teamId ? parseInt(teamId, 10) || null : null,
                };
                await playersApi.createPlayer(row);
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
                Players
            </h1>

            {totalCount === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                    No players yet. Add your first player.
                </p>
            ) : (
                <>
                    <ul className="flex flex-col gap-3">
                        {players.map((p) => (
                            <li key={p.id}>
                                <EntityListCard
                                    title={
                                        capitalizeName(p.full_name ?? '') ||
                                        '(No name)'
                                    }
                                    badge={
                                        p.teams?.short_name ||
                                        p.teams?.name ||
                                        null
                                    }
                                    extra={`${p.number}${p.nickname ? ` : ${capitalizeName(p.nickname)}` : ''}`}
                                    onEdit={() => openEdit(p)}
                                    onDelete={() => openDeleteConfirm(p)}
                                    showActions={!!user}
                                />
                            </li>
                        ))}
                    </ul>

                    <PaginationBar
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        itemLabel="player"
                        onPrev={() =>
                            setSearchParams({ page: String(currentPage - 1) })
                        }
                        onNext={() =>
                            setSearchParams({ page: String(currentPage + 1) })
                        }
                    />
                </>
            )}

            {user && <AddFab onClick={openAdd} aria-label="Add player" />}

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
                            {editing ? 'Edit player' : 'Add player'}
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
                                itemLabel="player"
                            />
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="player-full-name">Full name</Label>
                            <Input
                                id="player-full-name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g. Cristiano Ronaldo"
                                required
                                className="h-10"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="player-number">Number</Label>
                            <Input
                                id="player-number"
                                type="number"
                                min={0}
                                value={number}
                                onChange={(e) => setNumber(e.target.value)}
                                placeholder="e.g. 7"
                                required
                                className="h-10"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="player-nickname">
                                Nickname (optional)
                            </Label>
                            <Input
                                id="player-nickname"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="e.g. CR7"
                                className="h-10"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="player-team">Team (optional)</Label>
                            <select
                                id="player-team"
                                value={teamId}
                                onChange={(e) => setTeamId(e.target.value)}
                                className={cn(
                                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                )}
                            >
                                <option value="">No team</option>
                                {teams.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.short_name})
                                    </option>
                                ))}
                            </select>
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
                open={!!deletingPlayer}
                onClose={closeDeleteDialog}
                title="Delete player?"
                itemName={
                    deletingPlayer
                        ? capitalizeName(deletingPlayer.full_name ?? '') ||
                          '(No name)'
                        : 'this player'
                }
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
                error={deleteError}
            />
        </div>
    );
}
