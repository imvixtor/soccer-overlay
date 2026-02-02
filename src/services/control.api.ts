import type { Tables } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';

export type OverlayControlRow = Tables<'overlay_control'>;

/** Get overlay_control by user_id. */
export async function getOverlayControl(
    userId: string,
): Promise<{ data: OverlayControlRow | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('overlay_control')
        .select()
        .eq('user_id', userId)
        .maybeSingle();
    return { data, error: error ?? null };
}

/** Update overlay_control by user_id. */
export async function updateOverlayControl(
    userId: string,
    updates: Partial<Omit<Tables<'overlay_control'>, 'id' | 'user_id'>>,
): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('overlay_control')
        .update(updates)
        .eq('user_id', userId);
    return { error: error ?? null };
}

/** Upsert overlay_control (create if not exists). */
export async function upsertOverlayControl(
    userId: string,
    values: Partial<Omit<Tables<'overlay_control'>, 'id'>>,
): Promise<{ data: OverlayControlRow | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('overlay_control')
        .upsert({ ...values, user_id: userId }, { onConflict: 'user_id' })
        .select()
        .single();
    return { data, error: error ?? null };
}
