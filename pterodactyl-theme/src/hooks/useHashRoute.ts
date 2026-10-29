import { useCallback, useEffect, useState } from 'react';

/**
 * Enrutado por hash para la vista previa (funciona abriendo el HTML sin servidor).
 * Equivale a las rutas de routers/routes.ts:  /  /files  /startup  /settings
 */
export type TabKey = 'console' | 'files' | 'startup' | 'settings';

export interface Route {
    tab: TabKey;
    /** Directorio actual del gestor de archivos. */
    path: string;
}

const TABS: TabKey[] = ['files', 'startup', 'settings'];

function parse(hash: string): Route {
    const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const tab = (TABS as string[]).includes(parts[0]) ? (parts[0] as TabKey) : 'console';
    return { tab, path: tab === 'files' ? `/${parts.slice(1).join('/')}` : '/' };
}

export function toHash(tab: TabKey, path = '/'): string {
    if (tab === 'console') return '#/';
    if (tab !== 'files') return `#/${tab}`;
    const rest = path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return rest ? `#/files/${rest}` : '#/files';
}

export default function useHashRoute() {
    const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

    useEffect(() => {
        const onChange = () => setRoute(parse(window.location.hash));
        window.addEventListener('hashchange', onChange);
        return () => window.removeEventListener('hashchange', onChange);
    }, []);

    const navigate = useCallback((tab: TabKey, path = '/') => {
        const hash = toHash(tab, path);
        if (window.location.hash !== hash) window.location.hash = hash;
    }, []);

    return { route, navigate };
}
