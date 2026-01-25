import { createContext } from 'react-router';
import type { User } from '@supabase/supabase-js';

export const userContext = createContext<User | null>(null);
