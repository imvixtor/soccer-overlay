import { userContext } from '@/store/context';
import { type LoaderFunctionArgs } from 'react-router';
import { getMatchWithTeams } from './matches.api';
import { getMatchConfig } from './match-config.api';
import { supabase } from '@/lib/supabase/client';

export async function matchLoader({ context }: LoaderFunctionArgs) {
    const user = context.get(userContext);
    if (!user) throw new Response('Unauthorized', { status: 401 });

    const [matchRes, configRes, teamsRes] = await Promise.all([
        getMatchWithTeams(user.id),
        getMatchConfig(user.id),
        supabase
            .from('teams')
            .select('id, name, short_name')
            .eq('user_id', user.id)
            .order('name'),
    ]);

    if (matchRes.error) throw matchRes.error;
    if (configRes.error) throw configRes.error;
    if (teamsRes.error) throw teamsRes.error;

    const match = matchRes.data;
    const matchConfig = configRes.data;

    const homeTeamId = match?.home_team ?? null;
    const awayTeamId = match?.away_team ?? null;

    const [homeOnFieldRes, awayOnFieldRes] = await Promise.all([
        homeTeamId
            ? supabase
                  .from('players')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', user.id)
                  .eq('team_id', homeTeamId)
                  .eq('is_on_field', true)
            : Promise.resolve({ count: 0, error: null } as const),
        awayTeamId
            ? supabase
                  .from('players')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', user.id)
                  .eq('team_id', awayTeamId)
                  .eq('is_on_field', true)
            : Promise.resolve({ count: 0, error: null } as const),
    ]);

    if (homeOnFieldRes.error) throw homeOnFieldRes.error;
    if (awayOnFieldRes.error) throw awayOnFieldRes.error;

    return {
        match,
        matchConfig,
        teams: teamsRes.data ?? [],
        userId: user.id,
        lineup: {
            homeOnField: homeOnFieldRes.count ?? 0,
            awayOnField: awayOnFieldRes.count ?? 0,
        },
    };
}
