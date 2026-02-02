import type { TablesInsert, TablesUpdate } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';

export async function deletePlayer(id: number, userId: string): Promise<void> {
    const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error) throw error;
}

export async function createPlayer(
    data: TablesInsert<'players'>,
): Promise<void> {
    const { error } = await supabase.from('players').insert(data);
    if (error) throw error;
}

export async function updatePlayer(
    id: number,
    userId: string,
    data: TablesUpdate<'players'>,
): Promise<void> {
    const { error } = await supabase
        .from('players')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId);
    if (error) throw error;
}

export async function importPlayers(
    data: TablesInsert<'players'>[],
): Promise<void> {
    const { error } = await supabase.from('players').insert(data);
    if (error) throw error;
}

/**
 * Reset trạng thái cầu thủ về mặc định:
 * - không ra sân (is_on_field=false)
 * - sẵn sàng dự bị (is_substitute=true)
 */
export async function resetAllPlayersToBench(userId: string): Promise<void> {
    const { error } = await supabase
        .from('players')
        .update({ is_on_field: false, is_substitute: true })
        .eq('user_id', userId);
    if (error) throw error;
}

/**
 * Set đội hình ra sân cho danh sách đội (thường là 2 đội trong 1 trận).
 * Quy tắc:
 * - tất cả cầu thủ thuộc các teamIds: is_on_field=false, is_substitute=true
 * - các cầu thủ được chọn ra sân: is_on_field=true, is_substitute=false
 */
export async function setLineupForTeams(params: {
    userId: string;
    teamIds: number[];
    onFieldPlayerIds: number[];
}): Promise<void> {
    const { userId, teamIds, onFieldPlayerIds } = params;
    if (!teamIds.length) return;

    // Reset toàn bộ cầu thủ của 2 đội về dự bị
    const resetRes = await supabase
        .from('players')
        .update({ is_on_field: false, is_substitute: true })
        .eq('user_id', userId)
        .in('team_id', teamIds);
    if (resetRes.error) throw resetRes.error;

    // Đánh dấu cầu thủ ra sân
    if (onFieldPlayerIds.length) {
        const setRes = await supabase
            .from('players')
            .update({ is_on_field: true, is_substitute: false })
            .eq('user_id', userId)
            .in('id', onFieldPlayerIds);
        if (setRes.error) throw setRes.error;
    }
}
