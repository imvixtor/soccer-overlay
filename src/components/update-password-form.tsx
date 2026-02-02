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
import { Link, useSearchParams } from 'react-router';

export function UpdatePasswordForm({
    className,
    ...props
}: React.ComponentPropsWithoutRef<'div'>) {
    const [searchParams] = useSearchParams();
    const fromAdmin = searchParams.get('from') === 'admin';

    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            // Update this route to redirect to an authenticated route. The user already has an active session.
            location.href = '/admin';
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : 'Đã xảy ra lỗi');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Đặt lại mật khẩu</CardTitle>
                    <CardDescription>
                        Vui lòng nhập mật khẩu mới bên dưới.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleForgotPassword}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="password">Mật khẩu mới</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Mật khẩu mới"
                                    required
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-red-500">{error}</p>
                            )}
                            <div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoading}
                                >
                                    {isLoading
                                        ? 'Đang lưu...'
                                        : 'Lưu mật khẩu mới'}
                                </Button>
                                {fromAdmin && (
                                    <Link
                                        to="/admin"
                                        className="inline-block w-full mt-2"
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 w-full"
                                        >
                                            Quay lại quản trị
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
