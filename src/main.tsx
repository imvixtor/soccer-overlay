import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import './index.css';
import App from './App.tsx';
import AdminLayout from './layouts/AdminLayout.tsx';
import LoadingPage from './page/loading.tsx';

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
    },
    {
        path: '/auth/login',
        lazy: () =>
            import('./page/auth/login.tsx').then((module) => ({
                Component: module.default,
            })),
        hydrateFallbackElement: <LoadingPage />,
    },
    {
        path: '/auth/sign-up',
        lazy: () =>
            import('./page/auth/sign-up.tsx').then((module) => ({
                Component: module.default,
            })),
        hydrateFallbackElement: <LoadingPage />,
    },
    {
        path: '/auth/forgot-password',
        lazy: () =>
            import('./page/auth/forgot-password.tsx').then((module) => ({
                Component: module.default,
            })),
        hydrateFallbackElement: <LoadingPage />,
    },
    {
        path: '/auth/update-password',
        lazy: () =>
            import('./page/auth/update-password.tsx').then((module) => ({
                Component: module.default,
            })),
        hydrateFallbackElement: <LoadingPage />,
    },
    {
        path: '/admin',
        element: <AdminLayout />,
        children: [
            {
                index: true,
                lazy: () =>
                    import('./page/admin/Account.tsx').then((module) => ({
                        Component: module.default,
                    })),
                hydrateFallbackElement: <LoadingPage />,
            },
            {
                index: true,
                path: 'control',
                lazy: () =>
                    import('./page/admin/MatchControl.tsx').then((module) => ({
                        Component: module.default,
                    })),
                hydrateFallbackElement: <LoadingPage />,
            },
            {
                path: 'teams',
                lazy: () =>
                    import('./page/admin/TeamManagement.tsx').then(
                        (module) => ({
                            Component: module.default,
                        }),
                    ),
                hydrateFallbackElement: <LoadingPage />,
            },
            {
                path: 'players',
                lazy: () =>
                    import('./page/admin/PlayerManagement.tsx').then(
                        (module) => ({
                            Component: module.default,
                        }),
                    ),
                hydrateFallbackElement: <LoadingPage />,
            },
        ],
    },
]);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
);
