import { userContext } from '@/store/context';
import type { LoaderFunctionArgs } from 'react-router';
import { supabase } from '@/lib/supabase/client';
import {
    getPageFromUrl,
    getRangeForPage,
    getTotalPages,
} from '@/lib/pagination';

/** PostgREST trả 416 khi range vượt quá số bản ghi (vd: trang 2 nhưng chỉ có ≤10 bản ghi). */
const RANGE_NOT_SATISFIABLE = 416;

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

    if (error) {
        const err = error as { status?: number; statusCode?: number };
        const status = err.status ?? err.statusCode;
        const is416 =
            status === RANGE_NOT_SATISFIABLE ||
            (page > 1 && status == null);
        if (is416) {
            const { from: f0, to: t0 } = getRangeForPage(1);
            const fallback = await supabase
                .from('teams')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .order('name')
                .range(f0, t0);
            if (fallback.error) throw fallback.error;
            const totalCount = fallback.count ?? 0;
            return {
                teams: fallback.data ?? [],
                totalCount,
                totalPages: getTotalPages(totalCount),
                page: 1,
                user: { id: user.id },
            };
        }
        throw error;
    }

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
