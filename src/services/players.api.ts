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
