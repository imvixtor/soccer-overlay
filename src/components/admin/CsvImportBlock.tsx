import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Upload, Download } from 'lucide-react';

type CsvImportBlockProps = {
    fileInputRef: RefObject<HTMLInputElement | null>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onImportClick: () => void;
    onTemplateClick: () => void;
    isImporting: boolean;
    importError: string | null;
    importSuccess: number | null;
    itemLabel: string;
};

export function CsvImportBlock({
    fileInputRef,
    onFileChange,
    onImportClick,
    onTemplateClick,
    isImporting,
    importError,
    importSuccess,
    itemLabel,
}: CsvImportBlockProps) {
    return (
        <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">
                Nhập từ CSV
            </p>
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={onFileChange}
            />
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    size="sm"
                    onClick={onImportClick}
                    disabled={isImporting}
                    className="gap-2 w-full"
                >
                    {isImporting ? (
                        <Spinner className="size-4" />
                    ) : (
                        <Upload className="size-4" />
                    )}
                    Nhập CSV
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onTemplateClick}
                    className="gap-2 w-full"
                >
                    <Download className="size-4" />
                    Mẫu
                </Button>
            </div>
            {importError && (
                <p className="text-sm text-destructive">{importError}</p>
            )}
            {importSuccess !== null && (
                <p className="text-sm text-primary">
                    Đã nhập {importSuccess} {itemLabel}.
                </p>
            )}
        </div>
    );
}
