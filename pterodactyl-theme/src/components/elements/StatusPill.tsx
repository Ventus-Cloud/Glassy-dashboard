import type { PowerState, ServerStatus } from '@/api/types';
import { cx } from '@/lib/format';

type State = PowerState | 'installing' | 'restoring' | 'connecting';

const STATES: Record<State, { label: string; dot: string; text: string; ring: string; pulse: boolean }> = {
    running: { label: 'En ejecución', dot: 'bg-emerald-400', text: 'text-emerald-200', ring: 'bg-emerald-400/10 ring-emerald-400/30', pulse: true },
    starting: { label: 'Iniciando…', dot: 'bg-amber-400', text: 'text-amber-200', ring: 'bg-amber-400/10 ring-amber-400/30', pulse: true },
    stopping: { label: 'Deteniendo…', dot: 'bg-orange-400', text: 'text-orange-200', ring: 'bg-orange-400/10 ring-orange-400/30', pulse: true },
    offline: { label: 'Apagado', dot: 'bg-rose-400', text: 'text-rose-200', ring: 'bg-rose-500/10 ring-rose-400/30', pulse: false },
    installing: { label: 'Instalando…', dot: 'bg-sky-400', text: 'text-sky-200', ring: 'bg-sky-400/10 ring-sky-400/30', pulse: true },
    restoring: { label: 'Restaurando copia…', dot: 'bg-sky-400', text: 'text-sky-200', ring: 'bg-sky-400/10 ring-sky-400/30', pulse: true },
    connecting: { label: 'Conectando…', dot: 'bg-slate-400', text: 'text-slate-300', ring: 'bg-white/5 ring-white/15', pulse: true },
};

export function resolveState(power: PowerState | null, status: ServerStatus | undefined): State {
    if (status === 'installing') return 'installing';
    if (status === 'restoring_backup') return 'restoring';
    return power ?? 'connecting';
}

export function StatusDot({ state, className = 'h-2 w-2' }: { state: State; className?: string }) {
    const s = STATES[state];
    return (
        <span className={cx('relative flex shrink-0', className)}>
            {s.pulse && <span className={cx('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', s.dot)} />}
            <span className={cx('relative inline-flex h-full w-full rounded-full', s.dot)} />
        </span>
    );
}

export default function StatusPill({ state, small }: { state: State; small?: boolean }) {
    const s = STATES[state];
    return (
        <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1', s.ring, s.text, small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs')}>
            <StatusDot state={state} className={small ? 'h-1.5 w-1.5' : 'h-2 w-2'} />
            {s.label}
        </span>
    );
}
