/**
 * Entry point nhẹ cho trang overlay (dùng trong OBS, Prism, LiveNow).
 * Không load Tailwind, App, Admin - giảm đáng kể bundle size và tối ưu cho mobile.
 */
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { overlayLoader } from '@/services/overlay.loader';
import OverlayFallback from '@/components/overlay/OverlayFallback';
import './page/overlay.css';

const router = createBrowserRouter([
    {
        path: '/overlay/:userId',
        loader: overlayLoader,
        lazy: () =>
            import('./page/overlay.tsx').then((m) => ({
                Component: m.default,
            })),
        hydrateFallbackElement: <OverlayFallback />,
    },
]);

createRoot(document.getElementById('root')!).render(
    <RouterProvider router={router} />,
);
