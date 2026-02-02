import type { User } from '@supabase/supabase-js';
import type { Tables } from '@/types/supabase';
import type { MatchWithTeams } from '@/services/matches.api';
import type { MatchConfigRow } from '@/services/match-config.api';
import type { OverlayControlRow } from '@/services/control.api';

/** User rút gọn từ loader (chỉ cần id). */
export type LoaderUser = { id: string } | null;

/** Option đội dùng cho select (players). */
export type TeamOption = { id: number; name: string; short_name: string };

/** Player với relation teams (từ select). */
export type PlayerWithTeam = Tables<'players'> & {
    teams?: { name: string; short_name: string } | null;
};

export interface PlayersLoaderData {
    players: PlayerWithTeam[];
    totalCount: number;
    totalPages: number;
    page: number;
    teams: TeamOption[];
    user: LoaderUser;
}

export interface TeamsLoaderData {
    teams: Tables<'teams'>[];
    totalCount: number;
    totalPages: number;
    page: number;
    user: LoaderUser;
}

export interface AccountLoaderData {
    user: User;
}

export interface MatchLoaderData {
    match: MatchWithTeams | null;
    matchConfig: MatchConfigRow | null;
    teams: TeamOption[];
    userId: string;
    overlayControl: OverlayControlRow | null;
    lineup: {
        homeOnField: number;
        awayOnField: number;
    };
}
