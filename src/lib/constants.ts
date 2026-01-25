/** Số item mỗi trang, đọc từ VITE_PAGE_SIZE (1–100), mặc định 10. */
export const PAGE_SIZE = (() => {
    const raw = import.meta.env.VITE_PAGE_SIZE;
    const n = parseInt(String(raw ?? ''), 10);
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 100) : 10;
})();

/** Thời gian hiển thị thông báo import thành công (ms). */
export const IMPORT_SUCCESS_DURATION_MS = 4000;
