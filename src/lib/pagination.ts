import { PAGE_SIZE } from '@/lib/constants';

/** Parse `page` từ URL (>= 1). */
export function getPageFromUrl(url: string): number {
    const pageParam = new URL(url).searchParams.get('page');
    return Math.max(1, parseInt(pageParam || '1', 10) || 1);
}

/** Lấy team_id lọc từ URL (?team=id). Trả về null nếu "all" hoặc không hợp lệ. */
export function getTeamIdFilterFromUrl(url: string): number | null {
    const p = new URL(url).searchParams.get('team');
    if (p == null || p === '' || p === 'all') return null;
    const n = parseInt(p, 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
}

/** Tính { from, to } cho Supabase .range(from, to) với page 1-based. */
export function getRangeForPage(page: number): { from: number; to: number } {
    const from = (page - 1) * PAGE_SIZE;
    return { from, to: from + PAGE_SIZE - 1 };
}

/** Tính totalPages từ totalCount. */
export function getTotalPages(totalCount: number): number {
    return Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
}
