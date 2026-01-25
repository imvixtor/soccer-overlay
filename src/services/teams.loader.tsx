import { userContext } from '@/store/context';
import type { LoaderFunctionArgs } from 'react-router';
import { supabase } from '@/lib/supabase/client';

const PAGE_SIZE = (() => {
    const raw = import.meta.env.VITE_PAGE_SIZE;
    const n = parseInt(String(raw ?? ''), 10);
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 100) : 10;
})();

export async function teamsLoader({ request, context }: LoaderFunctionArgs) {
    const user = context.get(userContext);

    const url = new URL(request.url);
    const pageParam = url.searchParams.get('page');
    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
        .from('teams')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('name')
        .range(from, to);

    if (error) throw error;

    const totalCount = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return {
        teams: data ?? [],
        totalCount,
        totalPages,
        page,
        user,
    };
}
