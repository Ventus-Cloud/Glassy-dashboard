import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Icon, { type IconName } from '@/components/elements/Icon';
import { cx } from '@/lib/format';

export type Tone = 'success' | 'error' | 'warning' | 'info';

const TONES: Record<Tone, { icon: IconName; cls: string }> = {
    success: { icon: 'check', cls: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/25' },
    error: { icon: 'alert', cls: 'bg-rose-400/15 text-rose-300 ring-rose-400/25' },
    warning: { icon: 'alert', cls: 'bg-amber-400/15 text-amber-300 ring-amber-400/25' },
    info: { icon: 'info', cls: 'bg-violet-400/15 text-violet-300 ring-violet-400/25' },
};

interface ToastInput {
    title: string;
    description?: string;
    tone?: Tone;
    icon?: IconName;
}

interface ToastItem extends ToastInput {
    id: number;
    leaving: boolean;
}

const ToastContext = createContext<(t: ToastInput) => void>(() => undefined);

export const useToast = () => useContext(ToastContext);

let nextId = 0;

/** Sustituto glass de los FlashMessages del panel. */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const push = useCallback((t: ToastInput) => {
        const id = ++nextId;
        setToasts((list) => [...list.slice(-3), { ...t, id, leaving: false }]);
        window.setTimeout(() => setToasts((list) => list.map((x) => (x.id === id ? { ...x, leaving: true } : x))), 3800);
        window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4200);
    }, []);

    return (
        <ToastContext.Provider value={push}>
            {children}
            <div className='pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2' aria-live='polite'>
                {toasts.map((t) => {
                    const tone = TONES[t.tone ?? 'info'];
                    return (
                        <div
                            key={t.id}
                            role='status'
                            className={cx('glass-pop pointer-events-auto flex items-start gap-3 p-3 pr-4 transition-all duration-300', t.leaving ? 'translate-y-2 opacity-0' : 'animate-pop-in')}
                        >
                            <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1', tone.cls)}>
                                <Icon name={t.icon ?? tone.icon} className='h-4 w-4' />
                            </span>
                            <div className='min-w-0 pt-0.5'>
                                <p className='text-[13px] font-medium text-white'>{t.title}</p>
                                {t.description && <p className='mt-0.5 text-xs text-slate-400'>{t.description}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
