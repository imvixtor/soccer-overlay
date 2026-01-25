import type { TablesInsert, TablesUpdate } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';

export async function deleteTeam(id: number, userId: string): Promise<void> {
    const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error) throw error;
}

export async function createTeam(data: TablesInsert<'teams'>): Promise<void> {
    const { error } = await supabase.from('teams').insert(data);
    if (error) throw error;
}

export async function updateTeam(
    id: number,
    userId: string,
    data: TablesUpdate<'teams'>,
): Promise<void> {
    const { error } = await supabase
        .from('teams')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId);
    if (error) throw error;
}

export async function importTeams(
    data: TablesInsert<'teams'>[],
): Promise<void> {
    const { error } = await supabase.from('teams').insert(data);
    if (error) throw error;
}
