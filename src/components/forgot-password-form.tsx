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

export function ForgotPasswordForm({
    className,
    ...props
}: React.ComponentPropsWithoutRef<'div'>) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const clientUrl = import.meta.env.VITE_CLIENT_URL!;

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${clientUrl}/auth/update-password`,
            });
            if (error) throw error;
            setSuccess(true);
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : 'Đã xảy ra lỗi');
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
                            Kiểm tra Email
                        </CardTitle>
                        <CardDescription>
                            Đã gửi hướng dẫn đặt lại mật khẩu
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Nếu bạn đăng ký bằng email và mật khẩu, bạn sẽ nhận
                            được email đặt lại mật khẩu. Bạn có thể đóng tab này
                            và kiểm tra hộp thư.
                        </p>
                        <Link to="/" className="inline-block w-full mt-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="gap-2 w-full"
                            >
                                Trang chủ
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">
                            Đặt lại mật khẩu
                        </CardTitle>
                        <CardDescription>
                            Nhập email và chúng tôi sẽ gửi link đặt lại mật khẩu
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleForgotPassword}>
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
                                            ? 'Đang gửi...'
                                            : 'Gửi email đặt lại'}
                                    </Button>
                                    <Link
                                        to="/"
                                        className="inline-block w-full mt-2"
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 w-full"
                                        >
                                            Trang chủ
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                            <div className="mt-4 text-center text-sm">
                                Đã có tài khoản?{' '}
                                <Link
                                    to="/auth/login"
                                    className="underline underline-offset-4"
                                >
                                    Đăng nhập
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
