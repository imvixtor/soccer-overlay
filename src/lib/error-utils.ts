/** Chuẩn hóa mọi error (unknown) thành chuỗi hiển thị cho user. */
export function getErrorMessage(
    error: unknown,
    fallback = 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
): string {
    if (error instanceof Error) {
        const msg = error.message;
        if (/failed to fetch|network error|load failed/i.test(msg))
            return 'Không thể kết nối. Kiểm tra mạng hoặc thử lại sau.';
        return msg;
    }
    if (typeof error === 'string') return error;
    return fallback;
}
