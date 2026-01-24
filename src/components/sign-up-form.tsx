import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Link } from 'react-router';

export function SignUpForm({
    className,
    ...props
}: React.ComponentPropsWithoutRef<'div'>) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== repeatPassword) {
            setError('Passwords do not match');
            return;
        }
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
            setSuccess(true);
        } catch (error: unknown) {
            setError(
                error instanceof Error ? error.message : 'An error occurred',
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            {success ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">
                            Thank you for signing up!
                        </CardTitle>
                        <CardDescription>
                            Check your email to confirm
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            You've successfully signed up. Please check your
                            email to confirm your account before signing in. You
                            can close this tab now.
                        </p>
                        <Link to="/" className="inline-block w-full mt-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="gap-2 w-full"
                            >
                                Home
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Sign up</CardTitle>
                        <CardDescription>Create a new account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignUp}>
                            <div className="flex flex-col gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="email@example.com"
                                        required
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex items-center">
                                        <Label htmlFor="password">
                                            Password
                                        </Label>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex items-center">
                                        <Label htmlFor="repeat-password">
                                            Repeat Password
                                        </Label>
                                    </div>
                                    <Input
                                        id="repeat-password"
                                        type="password"
                                        required
                                        value={repeatPassword}
                                        onChange={(e) =>
                                            setRepeatPassword(e.target.value)
                                        }
                                    />
                                </div>
                                {error && (
                                    <p className="text-sm text-red-500">
                                        {error}
                                    </p>
                                )}
                                <div>
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isLoading}
                                    >
                                        {isLoading
                                            ? 'Creating an account...'
                                            : 'Sign up'}
                                    </Button>
                                    <Link
                                        to="/"
                                        className="inline-block w-full mt-2"
                                    >
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="gap-2 w-full"
                                        >
                                            Home
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                            <div className="mt-4 text-center text-sm">
                                Already have an account?{' '}
                                <Link
                                    to="/auth/login"
                                    className="underline underline-offset-4"
                                >
                                    Login
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
