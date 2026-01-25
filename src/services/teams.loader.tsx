import { userContext } from '@/store/context';
import { type LoaderFunctionArgs } from 'react-router';
import { supabase } from '@/lib/supabase/client';

export async function teamsLoader({ context }: LoaderFunctionArgs) {
    const user = context.get(userContext);

    const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

    if (error) throw error;
    return { teams: data ?? [], user };
}
