import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

/** Nếu page > totalPages (và totalPages >= 1), redirect về trang totalPages. */
export function usePaginationRedirect(page: number, totalPages: number): void {
    const [, setSearchParams] = useSearchParams();

    useEffect(() => {
        if (totalPages >= 1 && page > totalPages) {
            setSearchParams({ page: String(totalPages) }, { replace: true });
        }
    }, [totalPages, page, setSearchParams]);
}
