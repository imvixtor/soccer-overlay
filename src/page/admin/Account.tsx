import { useNavigate, useLoaderData } from 'react-router';
import { supabase } from '@/lib/supabase/client';
import type { AccountLoaderData } from '@/types/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { Link } from 'react-router';
import { LogOut, KeyRound, Mail, Calendar, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

function getInitial(name: string | undefined, email: string) {
    if (name?.trim()) return name.trim().charAt(0).toUpperCase();
    if (email?.trim()) return email.trim().charAt(0).toUpperCase();
    return '?';
}

export default function AccountPage() {
    const { user } = useLoaderData() as AccountLoaderData;
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const displayName =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split('@')[0] ||
        'User';
    const avatarUrl =
        (user.user_metadata?.avatar_url as string) ||
        (user.user_metadata?.picture as string) ||
        null;
    const initial = getInitial(displayName, user.email ?? '');

    const logout = async () => {
        setIsLoggingOut(true);
        try {
            await supabase.auth.signOut();
            navigate('/auth/login');
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className={cn('flex flex-col gap-4 sm:gap-6', 'max-w-xl mx-auto')}>
            <Card className="overflow-hidden mt-2">
                <CardContent className="space-y-4 py-4">
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
                        {/* Avatar: image first, fallback to initial */}
                        <div
                            className={cn(
                                'flex shrink-0 items-center justify-center rounded-full',
                                'size-14 sm:size-16',
                                'bg-primary/10 text-primary text-xl font-semibold sm:text-2xl',
                            )}
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt=""
                                    className="size-full rounded-full object-cover"
                                />
                            ) : (
                                initial
                            )}
                        </div>

                        <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
                            <h2 className="text-base font-semibold text-foreground sm:text-lg">
                                {displayName}
                            </h2>
                            <Badge
                                variant="secondary"
                                className="mt-1 w-fit gap-1 text-xs"
                            >
                                <ShieldCheck className="size-3" />
                                Verified
                            </Badge>
                        </div>
                    </div>
                    <InfoRow
                        icon={Mail}
                        label="Email"
                        value={user.email ?? '—'}
                    />
                    <InfoRow
                        icon={Calendar}
                        label="Member since"
                        value={formatDate(user.created_at)}
                    />
                    {user.last_sign_in_at && (
                        <InfoRow
                            icon={Calendar}
                            label="Last sign in"
                            value={formatDate(user.last_sign_in_at)}
                        />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base sm:text-lg">
                        Security
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                    <Button
                        asChild
                        variant="outline"
                        className="w-full gap-2 sm:w-auto"
                        size="default"
                    >
                        <Link to="/auth/update-password">
                            <KeyRound className="size-4" />
                            Change password
                        </Link>
                    </Button>
                    <Button
                        variant="destructive"
                        className="w-full gap-2 sm:flex-1 sm:max-w-50"
                        onClick={logout}
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut ? (
                            <Spinner className="size-4" />
                        ) : (
                            <LogOut className="size-4" />
                        )}
                        {isLoggingOut ? 'Signing out…' : 'Sign out'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <Icon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
            />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                    {label}
                </p>
                <p className="mt-0.5 text-sm text-foreground sm:text-base wrap-break-word">
                    {value}
                </p>
            </div>
        </div>
    );
}
