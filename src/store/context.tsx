import { createContext } from 'react-router';
import type { User } from '@supabase/supabase-js';
import type { MatchWithTeams } from '@/services/matches.api';

export const userContext = createContext<User | null>(null);
export const matchContext = createContext<MatchWithTeams | null>(null);
