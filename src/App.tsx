import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    PlayCircle,
    BarChart3,
    Users,
    Zap,
    Shield,
    Globe,
    ArrowRight,
    CheckCircle2,
} from 'lucide-react';

function App() {
    return (
        <div className="min-h-screen bg-linear-to-b from-background to-muted/20">
            {/* Navigation */}
            <nav className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <PlayCircle className="h-5 w-5" />
                            </div>
                            <span className="text-xl font-bold">
                                Soccer Overlay
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to="/admin">
                                <Button>Bảng điều khiển</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
                <div className="mx-auto max-w-4xl text-center">
                    <Badge variant="secondary" className="mb-4">
                        Hệ thống Stream Overlay chuyên nghiệp
                    </Badge>
                    <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-6">
                        Nâng tầm trải nghiệm
                        <span className="text-primary block mt-2">
                            Stream bóng đá của bạn
                        </span>
                    </h1>
                    <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                        Hệ thống overlay hiện đại, dễ sử dụng giúp bạn tạo ra
                        những stream bóng đá chuyên nghiệp với thống kê trực
                        tiếp, thông tin đội bóng và nhiều tính năng mạnh mẽ
                        khác.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/admin">
                            <Button size="lg" className="text-lg px-8">
                                Bảng điều khiển
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Button
                            size="lg"
                            variant="outline"
                            className="text-lg px-8"
                        >
                            Xem demo
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="mx-auto max-w-2xl text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                        Tính năng mạnh mẽ
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Tất cả công cụ bạn cần để tạo stream overlay chuyên
                        nghiệp
                    </p>
                </div>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                                <BarChart3 className="h-6 w-6" />
                            </div>
                            <CardTitle>Thống kê trực tiếp</CardTitle>
                            <CardDescription>
                                Hiển thị thống kê trận đấu theo thời gian thực:
                                tỷ số, thẻ phạt, thay người và nhiều hơn nữa.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                                <Users className="h-6 w-6" />
                            </div>
                            <CardTitle>Quản lý đội bóng</CardTitle>
                            <CardDescription>
                                Tạo và quản lý thông tin đội bóng, cầu thủ, logo
                                và màu sắc một cách dễ dàng.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                                <Zap className="h-6 w-6" />
                            </div>
                            <CardTitle>Tích hợp nhanh</CardTitle>
                            <CardDescription>
                                Tích hợp dễ dàng với OBS, Streamlabs và các phần
                                mềm stream phổ biến. Chỉ cần copy URL và thêm
                                vào scene.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                                <Shield className="h-6 w-6" />
                            </div>
                            <CardTitle>Bảo mật cao</CardTitle>
                            <CardDescription>
                                Dữ liệu được mã hóa và bảo vệ an toàn. Bạn hoàn
                                toàn kiểm soát quyền truy cập và chia sẻ.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                                <Globe className="h-6 w-6" />
                            </div>
                            <CardTitle>Tùy chỉnh linh hoạt</CardTitle>
                            <CardDescription>
                                Tùy chỉnh giao diện overlay theo phong cách của
                                bạn: màu sắc, font chữ, vị trí và kích thước.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                                <PlayCircle className="h-6 w-6" />
                            </div>
                            <CardTitle>Stream đa nền tảng</CardTitle>
                            <CardDescription>
                                Hỗ trợ stream trên YouTube, Twitch, Facebook
                                Live và các nền tảng streaming khác.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-muted/50 rounded-3xl my-20">
                <div className="mx-auto max-w-3xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                            Cách hoạt động
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Bắt đầu chỉ trong 3 bước đơn giản
                        </p>
                    </div>
                    <div className="space-y-8">
                        <div className="flex gap-6">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                                1
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">
                                    Tạo tài khoản
                                </h3>
                                <p className="text-muted-foreground">
                                    Đăng ký tài khoản miễn phí và thiết lập
                                    thông tin cơ bản của bạn.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                                2
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">
                                    Thiết lập giải đấu
                                </h3>
                                <p className="text-muted-foreground">
                                    Tạo giải đấu, thêm đội bóng, cầu thủ và cấu
                                    hình overlay theo ý muốn.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                                3
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">
                                    Bắt đầu stream
                                </h3>
                                <p className="text-muted-foreground">
                                    Copy URL overlay và thêm vào OBS hoặc phần
                                    mềm stream của bạn. Bắt đầu stream ngay!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="mx-auto max-w-4xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                            Tại sao chọn Soccer Overlay?
                        </h2>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="flex gap-4">
                            <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                            <div>
                                <h3 className="font-semibold mb-1">
                                    Miễn phí sử dụng
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Bắt đầu miễn phí với đầy đủ tính năng cơ bản
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                            <div>
                                <h3 className="font-semibold mb-1">
                                    Không cần cài đặt
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Hoạt động trên trình duyệt, không cần tải
                                    phần mềm
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                            <div>
                                <h3 className="font-semibold mb-1">
                                    Cập nhật real-time
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Thống kê và thông tin cập nhật ngay lập tức
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                            <div>
                                <h3 className="font-semibold mb-1">
                                    Hỗ trợ đa ngôn ngữ
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Giao diện tiếng Việt, dễ sử dụng cho người
                                    Việt
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                            <div>
                                <h3 className="font-semibold mb-1">
                                    Hiệu suất cao
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Tối ưu hóa cho stream, không làm chậm máy
                                    tính
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                            <div>
                                <h3 className="font-semibold mb-1">
                                    Cộng đồng hỗ trợ
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Đội ngũ hỗ trợ sẵn sàng giúp đỡ bạn
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <Card className="bg-primary text-primary-foreground border-0">
                    <CardContent className="pt-12 pb-12">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                                Sẵn sàng bắt đầu?
                            </h2>
                            <p className="text-lg mb-8 opacity-90">
                                Tham gia cùng hàng ngàn streamer đang sử dụng
                                Soccer Overlay để nâng tầm giải đấu của bạn.
                            </p>
                            <Link to="/admin">
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    className="text-lg px-8"
                                >
                                    Vào bảng điều khiển
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Footer */}
            <footer className="border-t py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <PlayCircle className="h-5 w-5" />
                            </div>
                            <span className="text-lg font-semibold">
                                Soccer Overlay
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground text-center md:text-right">
                            © {new Date().getFullYear()} Soccer Overlay.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;
