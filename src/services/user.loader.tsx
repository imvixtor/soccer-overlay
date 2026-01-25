import { userContext } from '@/store/context';
import { type LoaderFunctionArgs } from 'react-router';

export async function userLoader({ context }: LoaderFunctionArgs) {
    const user = context.get(userContext);
    return { user };
}
