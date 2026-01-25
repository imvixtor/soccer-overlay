import { userContext } from '@/store/context';
import type { LoaderFunctionArgs } from 'react-router';
import { supabase } from '@/lib/supabase/client';

const PAGE_SIZE = (() => {
    const raw = import.meta.env.VITE_PAGE_SIZE;
    const n = parseInt(String(raw ?? ''), 10);
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 100) : 10;
})();

export async function playersLoader({ request, context }: LoaderFunctionArgs) {
    const user = context.get(userContext);

    const url = new URL(request.url);
    const pageParam = url.searchParams.get('page');
    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [teamsRes, playersRes] = await Promise.all([
        supabase
            .from('teams')
            .select('id, name, short_name')
            .eq('user_id', user.id)
            .order('name'),
        supabase
            .from('players')
            .select(
                'id, first_name, last_name, number, nickname, team_id, teams(name, short_name)',
                {
                    count: 'exact',
                },
            )
            .eq('user_id', user.id)
            .order('last_name')
            .order('first_name')
            .range(from, to),
    ]);

    if (teamsRes.error) throw teamsRes.error;
    if (playersRes.error) throw playersRes.error;

    const totalCount = playersRes.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return {
        players: playersRes.data ?? [],
        totalCount,
        totalPages,
        page,
        teams: teamsRes.data ?? [],
        user,
    };
}
