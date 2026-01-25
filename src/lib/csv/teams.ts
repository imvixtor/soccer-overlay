import type { TablesInsert } from '@/types/supabase';
import { parseCSV } from '@/lib/parse-csv';

const TEAMS_HEADER_PATTERN = /^(name|short_name|short name|coach)$/i;

export const TEAMS_CSV_TEMPLATE =
    'name,short_name,coach\nManchester United,MUN,Alex Ferguson\nReal Madrid,RMA,\n';

function isTeamsHeader(row: string[]): boolean {
    return (
        row.length > 0 && TEAMS_HEADER_PATTERN.test(String(row[0] ?? '').trim())
    );
}

/** Parse CSV thành danh sách Insert. Hàng hợp lệ cần (name, short_name). */
export function parseTeamsCsv(
    text: string,
    userId: string,
): TablesInsert<'teams'>[] {
    const rows = parseCSV(text);
    const skipHeader = rows[0] && isTeamsHeader(rows[0]);
    const dataRows = skipHeader ? rows.slice(1) : rows;

    return dataRows
        .filter((r) => (r[0]?.trim() ?? '') && (r[1]?.trim() ?? ''))
        .map(
            (r): TablesInsert<'teams'> => ({
                user_id: userId,
                name: String(r[0] ?? '').trim(),
                short_name: String(r[1] ?? '').trim(),
                coach: (r[2]?.trim() ?? '') || null,
            }),
        );
}
