import { useRef, useState } from 'react';
import Icon from '@/components/elements/Icon';
import FloatingMenu, { type MenuAnchor } from '@/components/elements/FloatingMenu';
import { useToast } from '@/components/elements/Toast';
import { ServerContext } from '@/state/server';

/** Barra superior equivalente a components/NavigationBar.tsx. */
export default function NavigationBar() {
    const name = ServerContext.useStoreState((state) => state.server.data?.name);
    const toast = useToast();
    const [menu, setMenu] = useState<MenuAnchor | null>(null);
    const avatar = useRef<HTMLButtonElement>(null);
    const soon = (what: string) => toast({ title: `«${what}» queda fuera de esta vista`, description: 'El tema solo cubre la gestión de un servidor.', tone: 'info' });

    return (
        <header className='sticky top-0 z-40 px-3 pt-3 sm:px-6 lg:px-8'>
            <nav className='glass mx-auto flex max-w-[1500px] items-center gap-3 rounded-2xl px-3 py-2.5 sm:px-4' aria-label='Navegación del panel'>
                <a href='#/' className='flex shrink-0 items-center gap-2.5' aria-label='Glassy Panel'>
                    <svg viewBox='0 0 40 40' className='h-9 w-9 drop-shadow-[0_6px_18px_rgba(217,70,239,.55)]' aria-hidden='true'>
                        <defs>
                            <linearGradient id='logo' x1='0' y1='0' x2='1' y2='1'>
                                <stop offset='0' stopColor='#a78bfa' />
                                <stop offset='.55' stopColor='#8b5cf6' />
                                <stop offset='1' stopColor='#e879f9' />
                            </linearGradient>
                        </defs>
                        <path d='M20 2.5 35.2 11.25v17.5L20 37.5 4.8 28.75v-17.5Z' fill='url(#logo)' />
                        <path d='M20 2.5 35.2 11.25v17.5L20 37.5 4.8 28.75v-17.5Z' fill='none' stroke='rgba(255,255,255,.45)' />
                        <path d='M21.5 11 14 22h5l-1.5 7L25 18h-5z' fill='#fff' />
                    </svg>
                    <span className='hidden font-display text-[17px] font-semibold text-white sm:block'>
                        Glassy<span className='text-gradient'>Panel</span>
                    </span>
                </a>

                <div className='mx-1 hidden h-6 w-px bg-white/10 md:block' />
                <ol className='hidden min-w-0 items-center gap-1.5 text-sm text-slate-400 md:flex' aria-label='Ruta'>
                    <li>
                        <button onClick={() => soon('Mis servidores')} className='transition hover:text-white'>
                            Servidores
                        </button>
                    </li>
                    <Icon name='chevron-right' className='h-3.5 w-3.5 shrink-0' />
                    <li className='truncate text-slate-200'>{name ?? '…'}</li>
                </ol>

                <div className='ml-auto flex items-center gap-1.5'>
                    <button onClick={() => soon('Búsqueda global')} className='hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-400 transition hover:border-white/20 hover:text-white sm:flex'>
                        <Icon name='search' className='h-4 w-4' />
                        <span className='hidden lg:inline'>Buscar servidores…</span>
                        <span className='kbd hidden lg:inline'>Ctrl K</span>
                    </button>
                    <button onClick={() => soon('Panel de administración')} className='grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white' title='Administración' aria-label='Administración'>
                        <Icon name='shield' className='h-[18px] w-[18px]' />
                    </button>
                    <button
                        ref={avatar}
                        onClick={() => setMenu(menu ? null : avatar.current!.getBoundingClientRect())}
                        className='flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-white/10'
                        aria-haspopup='menu'
                        aria-expanded={!!menu}
                    >
                        <span className='relative grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white'>
                            AM
                            <span className='absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#1b1342] bg-emerald-400' />
                        </span>
                        <Icon name='chevron-down' className='hidden h-4 w-4 text-slate-400 sm:block' />
                    </button>
                </div>
            </nav>
            <FloatingMenu
                anchor={menu}
                onClose={() => setMenu(null)}
                header={
                    <div>
                        <p className='text-sm font-semibold text-white'>Alex Moreno</p>
                        <p className='text-xs text-slate-400'>alex · Administrador</p>
                    </div>
                }
                items={[
                    { label: 'Mi cuenta', icon: 'users', onSelect: () => soon('Mi cuenta') },
                    { label: 'Claves API', icon: 'key', onSelect: () => soon('Claves API') },
                    'divider',
                    { label: 'Cerrar sesión', icon: 'logout', danger: true, onSelect: () => soon('Cerrar sesión') },
                ]}
            />
        </header>
    );
}
