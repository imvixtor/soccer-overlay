/**
 * Fallback loading nhẹ cho overlay - không dùng lucide/Spinner để giảm bundle.
 */
export default function OverlayFallback() {
    return (
        <div
            className="overlay-loading"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            aria-hidden
        >
            <div
                style={{
                    width: 24,
                    height: 24,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#00aa8e',
                    borderRadius: '50%',
                    animation: 'overlay-spin 0.8s linear infinite',
                }}
            />
            <style>{`@keyframes overlay-spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}
