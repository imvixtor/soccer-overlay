import { redirect, type LoaderFunctionArgs } from 'react-router';
import { supabase } from '@/lib/supabase/client';
import { userContext } from '@/store/context';

export async function authMiddleware({ context }: LoaderFunctionArgs) {
    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
        throw redirect('/auth/login');
    }
    context.set(userContext, user);
}
