import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import './index.css';
import App from './App.tsx';
import AdminLayout from './page/layouts/AdminLayout.tsx';
import LoadingPage from './page/loading.tsx';
import ErrorPage from './page/ErrorPage.tsx';
import { authMiddleware } from './middlewares/auth.middleware.tsx';
import { userLoader } from './services/user.loader.tsx';
import { overlayLoader } from './services/overlay.loader.tsx';
import { teamsLoader } from './services/teams.loader.tsx';
import { playersLoader } from './services/players.loader.tsx';
import { matchLoader } from './services/match.loader.tsx';

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        errorElement: <ErrorPage />,
    },
    {
        path: '/overlay/:userId',
        loader: overlayLoader,
        lazy: () =>
            import('./page/overlay.tsx').then((module) => ({
                Component: module.default,
            })),
        hydrateFallbackElement: <LoadingPage />,
        errorElement: <ErrorPage />,
    },
    {
        path: '/auth/login',
        lazy: () =>
            import('./page/auth/login.tsx').then((module) => ({
                Component: module.default,
            })),
        hydrateFallbackElement: <LoadingPage />,
        errorElement: <ErrorPage />,
    },
    {
        path: '/auth/sign-up',
        lazy: () =>
            import('./page/auth/sign-up.tsx').then((module) => ({
                Component: module.default,
            })),
        hydrateFallbackElement: <LoadingPage />,
        errorElement: <ErrorPage />,
    },
    {
        path: '/auth/forgot-password',
        lazy: () =>
            import('./page/auth/forgot-password.tsx').then((module) => ({
                Component: module.default,
            })),
        hydrateFallbackElement: <LoadingPage />,
        errorElement: <ErrorPage />,
    },
    {
        path: '/auth/update-password',
        lazy: () =>
            import('./page/auth/update-password.tsx').then((module) => ({
                Component: module.default,
            })),
        hydrateFallbackElement: <LoadingPage />,
        errorElement: <ErrorPage />,
    },
    {
        path: '/admin',
        middleware: [authMiddleware],
        element: <AdminLayout />,
        errorElement: <ErrorPage />,
        children: [
            {
                index: true,
                loader: userLoader,
                lazy: () =>
                    import('./page/admin/Account.tsx').then((module) => ({
                        Component: module.default,
                    })),
                hydrateFallbackElement: <LoadingPage />,
            },
            {
                path: 'control',
                loader: matchLoader,
                lazy: () =>
                    import('./page/admin/MatchControl.tsx').then((module) => ({
                        Component: module.default,
                    })),
                hydrateFallbackElement: <LoadingPage />,
            },
            {
                path: 'teams',
                loader: teamsLoader,
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
                loader: playersLoader,
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
