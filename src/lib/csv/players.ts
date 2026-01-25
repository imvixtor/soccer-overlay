import type { TablesInsert } from '@/types/supabase';
import type { TeamOption } from '@/types/loader';
import { parseCSV } from '@/lib/parse-csv';

const PLAYERS_HEADER_PATTERN =
    /^(full_name|full name|name|number|nickname|team|team_short_name|team_short|short_name)$/i;

export const PLAYERS_CSV_TEMPLATE =
    'full_name,number,nickname,team_short_name\nCristiano Ronaldo,7,CR7,RMA\nJohn Doe,10,,MUN\n';

export function resolveTeamId(
    shortOrName: string,
    teams: TeamOption[],
): number | null {
    const q = shortOrName.trim().toLowerCase();
    if (!q) return null;
    const t = teams.find(
        (x) => x.short_name.toLowerCase() === q || x.name.toLowerCase() === q,
    );
    return t?.id ?? null;
}

function isPlayersHeader(row: string[]): boolean {
    return (
        row.length > 0 &&
        PLAYERS_HEADER_PATTERN.test(String(row[0] ?? '').trim())
    );
}

/** Parse CSV thành danh sách Insert. Hàng hợp lệ cần (full_name, number). */
export function parsePlayersCsv(
    text: string,
    teams: TeamOption[],
    userId: string,
): TablesInsert<'players'>[] {
    const rows = parseCSV(text);
    const skipHeader = rows[0] && isPlayersHeader(rows[0]);
    const dataRows = skipHeader ? rows.slice(1) : rows;

    return dataRows
        .filter((r) => (r[0]?.trim() ?? '') && (r[1]?.trim() ?? ''))
        .map(
            (r): TablesInsert<'players'> => ({
                user_id: userId,
                full_name: String(r[0] ?? '').trim() || null,
                number: parseInt(String(r[1] ?? '0'), 10) || 0,
                nickname: (r[2]?.trim() ?? '') || null,
                team_id: resolveTeamId(String(r[3] ?? '').trim(), teams),
            }),
        );
}
