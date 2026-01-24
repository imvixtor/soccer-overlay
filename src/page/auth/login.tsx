import { LoginForm } from '@/components/login-form';

export default function Page() {
    return (
        <div className="flex h-[calc(100svh-4rem)] w-full items-center justify-center relative">
            <div className="w-full max-w-sm">
                <LoginForm />
            </div>
        </div>
    );
}
