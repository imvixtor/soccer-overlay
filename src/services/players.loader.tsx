import { userContext } from '@/store/context';
import type { LoaderFunctionArgs } from 'react-router';
import { supabase } from '@/lib/supabase/client';
import {
    getPageFromUrl,
    getRangeForPage,
    getTotalPages,
    getTeamIdFilterFromUrl,
} from '@/lib/pagination';

export async function playersLoader({ request, context }: LoaderFunctionArgs) {
    const user = context.get(userContext);
    if (!user) throw new Response('Unauthorized', { status: 401 });

    const page = getPageFromUrl(request.url);
    const teamId = getTeamIdFilterFromUrl(request.url);
    const { from, to } = getRangeForPage(page);

    const [teamsRes, playersRes] = await Promise.all([
        supabase
            .from('teams')
            .select('id, name, short_name')
            .eq('user_id', user.id)
            .order('name'),
        (() => {
            let q = supabase
                .from('players')
                .select(
                    'id, full_name, number, nickname, team_id, teams(name, short_name)',
                    { count: 'exact' },
                )
                .eq('user_id', user.id);
            if (teamId != null) q = q.eq('team_id', teamId);
            return q.order('full_name').range(from, to);
        })(),
    ]);

    if (teamsRes.error) throw teamsRes.error;
    if (playersRes.error) throw playersRes.error;

    const totalCount = playersRes.count ?? 0;
    const totalPages = getTotalPages(totalCount);

    return {
        players: playersRes.data ?? [],
        totalCount,
        totalPages,
        page,
        teams: teamsRes.data ?? [],
        user: { id: user.id },
    };
}
