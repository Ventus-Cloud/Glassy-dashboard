import Icon from '@/components/elements/Icon';

/** Ruta navegable /home/container › carpeta › subcarpeta. */
export default function FileManagerBreadcrumbs({ directory, onNavigate }: { directory: string; onNavigate: (path: string) => void }) {
    const parts = directory.split('/').filter(Boolean);
    return (
        <nav className='no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto font-mono text-[13px]' aria-label='Ruta del directorio'>
            <button onClick={() => onNavigate('/')} className='flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-slate-400 transition hover:bg-white/10 hover:text-white'>
                <Icon name='home' className='h-3.5 w-3.5' />
                <span className='hidden sm:inline'>/home/container</span>
                <span className='sm:hidden'>~</span>
            </button>
            {parts.map((part, i) => {
                const path = `/${parts.slice(0, i + 1).join('/')}`;
                const last = i === parts.length - 1;
                return (
                    <span key={path} className='flex shrink-0 items-center gap-1'>
                        <Icon name='chevron-right' className='h-3.5 w-3.5 text-slate-600' />
                        <button
                            onClick={() => onNavigate(path)}
                            aria-current={last ? 'page' : undefined}
                            className={last ? 'rounded-lg bg-white/[0.08] px-2 py-1 text-white' : 'rounded-lg px-2 py-1 text-slate-400 transition hover:bg-white/10 hover:text-white'}
                        >
                            {part}
                        </button>
                    </span>
                );
            })}
        </nav>
    );
}
