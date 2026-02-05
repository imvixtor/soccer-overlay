import { useRouteError, isRouteErrorResponse, Link, useNavigate } from 'react-router';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { getErrorMessage } from '@/lib/error-utils';
import { Button } from '@/components/ui/button';

/** Trang hiển thị khi có lỗi (loader, render, fetch...) thay cho màn hình lỗi mặc định. */
export default function ErrorPage() {
    const error = useRouteError();
    const navigate = useNavigate();

    const is404 = isRouteErrorResponse(error) && error.status === 404;
    const message = is404
        ? 'Trang không tồn tại.'
        : getErrorMessage(error, 'Đã xảy ra lỗi. Vui lòng thử lại sau.');

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="rounded-full bg-destructive/10 p-4">
                        <AlertCircle className="h-12 w-12 text-destructive" />
                    </div>
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-foreground mb-2">
                        {is404 ? 'Không tìm thấy trang' : 'Có lỗi xảy ra'}
                    </h1>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {message}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        variant="default"
                        onClick={() => navigate(0)}
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Thử lại
                    </Button>
                    <Link to="/">
                        <Button variant="outline" className="gap-2 w-full sm:w-auto">
                            <Home className="h-4 w-4" />
                            Về trang chủ
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
