import type { PowerState } from '@/api/types';
import { cx } from '@/lib/format';

/** Indicador LIVE / SYNC / OFF según el estado de energía. */
export default function LiveChip({ state, className }: { state: PowerState | null; className?: string }) {
    const base = 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider ring-1';
    if (state === 'running') {
        return (
            <span className={cx(base, 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25', className)}>
                <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.9)]' />
                LIVE
            </span>
        );
    }
    if (state === 'offline' || state === null) {
        return (
            <span className={cx(base, 'bg-white/5 text-slate-400 ring-white/10', className)}>
                <span className='h-1.5 w-1.5 rounded-full bg-slate-500' />
                OFF
            </span>
        );
    }
    return (
        <span className={cx(base, 'bg-amber-400/10 text-amber-300 ring-amber-400/25', className)}>
            <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400' />
            SYNC
        </span>
    );
}
