import { userContext } from '@/store/context';
import type { LoaderFunctionArgs } from 'react-router';
import { supabase } from '@/lib/supabase/client';
import {
    getPageFromUrl,
    getRangeForPage,
    getTotalPages,
} from '@/lib/pagination';

export async function teamsLoader({ request, context }: LoaderFunctionArgs) {
    const user = context.get(userContext);
    if (!user) throw new Response('Unauthorized', { status: 401 });

    const page = getPageFromUrl(request.url);
    const { from, to } = getRangeForPage(page);

    const { data, error, count } = await supabase
        .from('teams')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('name')
        .range(from, to);

    if (error) throw error;

    const totalCount = count ?? 0;
    const totalPages = getTotalPages(totalCount);

    return {
        teams: data ?? [],
        totalCount,
        totalPages,
        page,
        user: { id: user.id },
    };
}
