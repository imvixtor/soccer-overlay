/** Chuẩn hóa mọi error (unknown) thành chuỗi hiển thị cho user. */
export function getErrorMessage(
    error: unknown,
    fallback = 'Something went wrong',
): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return fallback;
}
