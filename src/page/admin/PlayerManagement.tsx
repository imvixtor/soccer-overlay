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
import { cn, capitalizeName } from '@/lib/utils';
import { parseCSV } from '@/lib/parse-csv';
import { AddFab } from '@/components/admin/AddFab';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { EntityListCard } from '@/components/admin/EntityListCard';
import { PaginationBar } from '@/components/admin/PaginationBar';

type PlayerRow = Tables<'players'> & {
    teams?: { name: string; short_name: string } | null;
};
type TeamOption = { id: number; name: string; short_name: string };

export default function PlayerManagementPage() {
    const { players, totalCount, totalPages, page, teams, user } =
        useLoaderData() as {
            players: PlayerRow[];
            totalCount: number;
            totalPages: number;
            page: number;
            teams: TeamOption[];
            user: { id: string } | null;
        };
    const { revalidate } = useRevalidator();
    const [, setSearchParams] = useSearchParams();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editing, setEditing] = useState<PlayerRow | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [number, setNumber] = useState('');
    const [nickname, setNickname] = useState('');
    const [teamId, setTeamId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [deletingPlayer, setDeletingPlayer] = useState<PlayerRow | null>(
        null,
    );
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
        setFirstName('');
        setLastName('');
        setNumber('');
        setNickname('');
        setTeamId('');
        setError(null);
        setImportError(null);
        setImportSuccess(null);
        dialogRef.current?.showModal();
    };

    const openEdit = (p: PlayerRow) => {
        setEditing(p);
        setFirstName(p.first_name);
        setLastName(p.last_name);
        setNumber(String(p.number));
        setNickname(p.nickname ?? '');
        setTeamId(p.team_id != null ? String(p.team_id) : '');
        setError(null);
        dialogRef.current?.showModal();
    };

    const closeDialog = () => {
        dialogRef.current?.close();
    };

    const openDeleteConfirm = (p: PlayerRow) => {
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
            const { error: err } = await supabase
                .from('players')
                .delete()
                .eq('id', deletingPlayer.id)
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

    const resolveTeamId = (
        shortOrName: string,
        teamsList: TeamOption[],
    ): number | null => {
        const q = shortOrName.trim().toLowerCase();
        if (!q) return null;
        const t = teamsList.find(
            (x) =>
                x.short_name.toLowerCase() === q || x.name.toLowerCase() === q,
        );
        return t?.id ?? null;
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
                /^(first_name|first name|last_name|last name|number|nickname|team|team_short_name|team_short|short_name)$/i.test(
                    String(rows[0][0] ?? '').trim(),
                );
            const data = (isHeader ? rows.slice(1) : rows)
                .filter(
                    (r) =>
                        (r[0]?.trim() ?? '') &&
                        (r[1]?.trim() ?? '') &&
                        (r[2]?.trim() ?? ''),
                )
                .map(
                    (r): TablesInsert<'players'> => ({
                        user_id: user.id,
                        first_name: String(r[0] ?? '').trim(),
                        last_name: String(r[1] ?? '').trim(),
                        number: parseInt(String(r[2] ?? '0'), 10) || 0,
                        nickname: (r[3]?.trim() ?? '') || null,
                        team_id: resolveTeamId(
                            String(r[4] ?? '').trim(),
                            teams,
                        ),
                    }),
                );

            if (data.length === 0) {
                setImportError(
                    'No valid rows. Each row needs first_name, last_name, number.',
                );
                return;
            }

            const { error: err } = await supabase.from('players').insert(data);
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
            'first_name,last_name,number,nickname,team_short_name\nCristiano,Ronaldo,7,CR7,RMA\nJohn,Doe,10,,MUN\n';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'players-template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

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
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    number: num,
                    nickname: nickname.trim() || null,
                    team_id: teamId ? parseInt(teamId, 10) || null : null,
                };
                const { error: err } = await supabase
                    .from('players')
                    .update(patch)
                    .eq('id', editing.id)
                    .eq('user_id', user.id);
                if (err) throw err;
            } else {
                const row: TablesInsert<'players'> = {
                    user_id: user.id,
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    number: num,
                    nickname: nickname.trim() || null,
                    team_id: teamId ? parseInt(teamId, 10) || null : null,
                };
                const { error: err } = await supabase
                    .from('players')
                    .insert(row);
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
                Players
            </h1>

            {totalCount === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                    No players yet. Add your first player.
                </p>
            ) : (
                <>
                    <ul className="flex flex-col gap-3">
                        {players.map((p: PlayerRow) => (
                            <li key={p.id}>
                                <EntityListCard
                                    title={`${capitalizeName(p.last_name)} ${capitalizeName(p.first_name)}`}
                                    badge={
                                        p.teams?.short_name ||
                                        p.teams?.name ||
                                        null
                                    }
                                    extra={`${p.number}${
                                        p.nickname
                                            ? ` : ${capitalizeName(p.nickname)}`
                                            : ''
                                    }`}
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
                                        Imported {importSuccess} player
                                        {importSuccess !== 1 ? 's' : ''}.
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="player-first">First name</Label>
                            <Input
                                id="player-first"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="e.g. Cristiano"
                                required
                                className="h-10"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="player-last">Last name</Label>
                            <Input
                                id="player-last"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="e.g. Ronaldo"
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
                        ? `${capitalizeName(deletingPlayer.last_name)} ${capitalizeName(deletingPlayer.first_name)}`
                        : 'this player'
                }
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
                error={deleteError}
            />
        </div>
    );
}
