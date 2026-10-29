import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import Icon, { type IconName } from '@/components/elements/Icon';
import { StatusDot, resolveState } from '@/components/elements/StatusPill';
import { ServerContext } from '@/state/server';
import type { TabKey } from '@/hooks/useHashRoute';

export const TABS: { key: TabKey; label: string; short: string; icon: IconName }[] = [
    { key: 'console', label: 'Consola', short: 'Consola', icon: 'terminal' },
    { key: 'files', label: 'Archivos', short: 'Archivos', icon: 'folder' },
    { key: 'startup', label: 'Inicio', short: 'Inicio', icon: 'rocket' },
    { key: 'settings', label: 'Ajustes y red', short: 'Ajustes', icon: 'settings' },
];

/** Pestañas con indicador deslizante (equivale a SubNavigation del panel). */
export default function SubNavigation({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
    const list = useRef<HTMLDivElement>(null);
    const [indicator, setIndicator] = useState({ x: 0, w: 0 });
    const power = ServerContext.useStoreState((state) => state.status.value);
    const status = ServerContext.useStoreState((state) => state.server.data?.status);

    useLayoutEffect(() => {
        const update = () => {
            const el = list.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
            if (!el) return;
            setIndicator({ x: el.offsetLeft, w: el.offsetWidth });
            // Solo desplaza la propia barra (nunca la página) si la pestaña queda fuera.
            const box = list.current!;
            if (el.offsetLeft < box.scrollLeft || el.offsetLeft + el.offsetWidth > box.scrollLeft + box.clientWidth) {
                box.scrollTo({ left: el.offsetLeft - 8, behavior: 'smooth' });
            }
        };
        update();
        const ro = new ResizeObserver(update);
        if (list.current) ro.observe(list.current);
        document.fonts?.ready.then(update);
        return () => ro.disconnect();
    }, [active]);

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const i = TABS.findIndex((t) => t.key === active);
        const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
        onChange(next.key);
        list.current?.querySelector<HTMLElement>(`[data-tab="${next.key}"]`)?.focus();
    };

    return (
        <div className='glass sticky top-[4.75rem] z-30 rounded-2xl p-1.5'>
            <div ref={list} role='tablist' aria-label='Secciones del servidor' onKeyDown={onKeyDown} className='no-scrollbar relative flex gap-1 overflow-x-auto'>
                <span className='tab-indicator' style={{ width: indicator.w, transform: `translateX(${indicator.x}px)` }} aria-hidden='true' />
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        data-tab={tab.key}
                        role='tab'
                        id={`tab-${tab.key}`}
                        aria-selected={active === tab.key}
                        aria-controls={`panel-${tab.key}`}
                        tabIndex={active === tab.key ? 0 : -1}
                        onClick={() => onChange(tab.key)}
                        className='tab-btn min-w-0 flex-1 flex-col justify-center gap-1 px-2 py-2 text-[11px] sm:flex-none sm:flex-row sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm'
                    >
                        <Icon name={tab.icon} className='h-4 w-4' />
                        <span className='hidden sm:inline'>{tab.label}</span>
                        <span className='truncate sm:hidden'>{tab.short}</span>
                        {tab.key === 'console' && <StatusDot state={resolveState(power, status)} className='absolute right-2 top-2 h-1.5 w-1.5 sm:static' />}
                    </button>
                ))}
            </div>
        </div>
    );
}
