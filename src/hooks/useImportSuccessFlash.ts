import { useEffect } from 'react';
import { IMPORT_SUCCESS_DURATION_MS } from '@/lib/constants';

/** Sau khi importSuccess thay đổi (khác null), reset về null sau IMPORT_SUCCESS_DURATION_MS. */
export function useImportSuccessFlash(
    importSuccess: number | null,
    onClear: () => void,
): void {
    useEffect(() => {
        if (importSuccess === null) return;
        const t = setTimeout(onClear, IMPORT_SUCCESS_DURATION_MS);
        return () => clearTimeout(t);
    }, [importSuccess, onClear]);
}
