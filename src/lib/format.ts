/** Định dạng ISO date để hiển thị (ví dụ: "January 25, 2025"). */
export function formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Định dạng tên cầu thủ dạng "#10 Tên" với fallback an toàn.
 * Dùng chung cho mọi nơi hiển thị cầu thủ để dễ bảo trì.
 */
export function formatPlayerLabel<
    T extends
        | { number: number; full_name: string | null; nickname: string | null }
        | null
        | undefined,
>(player: T, unknownLabel = 'Unknown'): string {
    if (!player) return unknownLabel;
    const name =
        player.nickname?.trim() || player.full_name?.trim() || unknownLabel;
    return `#${player.number} ${name}`;
}
