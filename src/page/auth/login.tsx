import { LoginForm } from '@/components/login-form';

export default function Page() {
    return (
        <div className="flex h-[calc(100svh-4rem)] w-full items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-sm">
                <LoginForm />
            </div>
        </div>
    );
}
