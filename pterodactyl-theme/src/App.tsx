import { useEffect, useState, type ReactNode } from 'react';
import { ToastProvider } from '@/components/elements/Toast';
import Background from '@/components/server/Background';
import NavigationBar from '@/components/server/NavigationBar';
import ServerHeader from '@/components/server/ServerHeader';
import SubNavigation from '@/components/server/SubNavigation';
import WebsocketHandler from '@/components/server/WebsocketHandler';
import ServerConsoleContainer from '@/components/server/console/ServerConsoleContainer';
import FileManagerContainer from '@/components/server/files/FileManagerContainer';
import SettingsContainer from '@/components/server/settings/SettingsContainer';
import StartupContainer from '@/components/server/startup/StartupContainer';
import useHashRoute, { type TabKey } from '@/hooks/useHashRoute';
import useSpotlight from '@/hooks/useSpotlight';
import { ServerContext } from '@/state/server';

const SERVER_UUID = '8f3a2c1e-5b7d-4e2a-9c61-3f0b7a2d91e4';

/**
 * Panel de pestaña. Se monta la primera vez que se visita y después solo se
 * oculta: la consola, las gráficas y las animaciones siguen vivas en segundo
 * plano y cada pestaña conserva su estado (carpeta abierta, formularios…).
 */
function TabPanel({ id, active, visited, children }: { id: TabKey; active: boolean; visited: boolean; children: ReactNode }) {
    if (!visited) return null;
    return (
        <section id={`panel-${id}`} role='tabpanel' aria-labelledby={`tab-${id}`} hidden={!active} className='animate-tab-in'>
            {children}
        </section>
    );
}

/** Equivale a routers/ServerRouter.tsx: cabecera, pestañas y contenido. */
export default function App() {
    useSpotlight();
    const { route, navigate } = useHashRoute();
    const [filesPath, setFilesPath] = useState(route.tab === 'files' ? route.path : '/');
    const [visited, setVisited] = useState<Set<TabKey>>(() => new Set<TabKey>(['console', route.tab]));

    useEffect(() => {
        if (route.tab === 'files') setFilesPath(route.path);
        setVisited((v) => (v.has(route.tab) ? v : new Set(v).add(route.tab)));
    }, [route]);

    const go = (tab: TabKey) => navigate(tab, tab === 'files' ? filesPath : '/');

    return (
        <ToastProvider>
            <ServerContext.Provider>
                <WebsocketHandler uuid={SERVER_UUID} />
                <Background />
                <div className='relative z-10 flex min-h-dvh flex-col'>
                    <NavigationBar />
                    <main className='mx-auto w-full max-w-[1500px] flex-1 space-y-4 px-3 pb-12 pt-4 sm:px-6 lg:space-y-5 lg:px-8 lg:pt-5'>
                        <ServerHeader />
                        <SubNavigation active={route.tab} onChange={go} />
                        <TabPanel id='console' active={route.tab === 'console'} visited>
                            <ServerConsoleContainer />
                        </TabPanel>
                        <TabPanel id='files' active={route.tab === 'files'} visited={visited.has('files')}>
                            <FileManagerContainer directory={filesPath} onNavigate={(path) => navigate('files', path)} />
                        </TabPanel>
                        <TabPanel id='startup' active={route.tab === 'startup'} visited={visited.has('startup')}>
                            <StartupContainer
                                onOpenNetwork={() => {
                                    go('settings');
                                    window.setTimeout(() => document.getElementById('network')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
                                }}
                            />
                        </TabPanel>
                        <TabPanel id='settings' active={route.tab === 'settings'} visited={visited.has('settings')}>
                            <SettingsContainer onOpenConsole={() => go('console')} />
                        </TabPanel>
                    </main>
                    <footer className='mx-auto flex w-full max-w-[1500px] flex-col items-center justify-between gap-2 px-4 pb-6 text-[11px] text-slate-500 sm:flex-row sm:px-6 lg:px-8'>
                        <p>Glassy — tema para Pterodactyl® Panel · vista previa con datos simulados</p>
                        <p className='font-mono'>React · Tailwind CSS v4</p>
                    </footer>
                </div>
            </ServerContext.Provider>
        </ToastProvider>
    );
}
