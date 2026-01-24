import { Spinner } from '@/components/ui/spinner';

export default function LoadingPage() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <Spinner className="h-8 w-8" />
        </div>
    );
}
