/** Định dạng ISO date để hiển thị (ví dụ: "January 25, 2025"). */
export function formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}
