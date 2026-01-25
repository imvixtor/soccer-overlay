import type { TablesInsert } from '@/types/supabase';
import type { TeamOption } from '@/types/loader';
import { parseCSV } from '@/lib/parse-csv';

const PLAYERS_HEADER_PATTERN =
    /^(first_name|first name|last_name|last name|number|nickname|team|team_short_name|team_short|short_name)$/i;

export const PLAYERS_CSV_TEMPLATE =
    'first_name,last_name,number,nickname,team_short_name\nCristiano,Ronaldo,7,CR7,RMA\nJohn,Doe,10,,MUN\n';

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

/** Parse CSV thành danh sách Insert. Hàng hợp lệ cần (first_name, last_name, number). */
export function parsePlayersCsv(
    text: string,
    teams: TeamOption[],
    userId: string,
): TablesInsert<'players'>[] {
    const rows = parseCSV(text);
    const skipHeader = rows[0] && isPlayersHeader(rows[0]);
    const dataRows = skipHeader ? rows.slice(1) : rows;

    return dataRows
        .filter(
            (r) =>
                (r[0]?.trim() ?? '') &&
                (r[1]?.trim() ?? '') &&
                (r[2]?.trim() ?? ''),
        )
        .map(
            (r): TablesInsert<'players'> => ({
                user_id: userId,
                first_name: String(r[0] ?? '').trim(),
                last_name: String(r[1] ?? '').trim(),
                number: parseInt(String(r[2] ?? '0'), 10) || 0,
                nickname: (r[3]?.trim() ?? '') || null,
                team_id: resolveTeamId(String(r[4] ?? '').trim(), teams),
            }),
        );
}
