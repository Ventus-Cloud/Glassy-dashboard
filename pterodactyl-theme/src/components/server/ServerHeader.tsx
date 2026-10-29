import CopyButton from '@/components/elements/CopyButton';
import Icon from '@/components/elements/Icon';
import StatusPill, { resolveState } from '@/components/elements/StatusPill';
import { ServerContext } from '@/state/server';
import { bytesToString, clamp, cx, formatUptime, mibToBytes } from '@/lib/format';

const GLOW: Record<string, string> = {
    running: 'rgba(16,185,129,.36)',
    starting: 'rgba(245,158,11,.34)',
    stopping: 'rgba(249,115,22,.32)',
    offline: 'rgba(244,63,94,.28)',
    installing: 'rgba(56,189,248,.34)',
    restoring: 'rgba(56,189,248,.34)',
    connecting: 'rgba(148,163,184,.25)',
};

function MiniMeter({ label, value, sub, pct }: { label: string; value: string; sub: string; pct: number }) {
    return (
        <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-3'>
            <div className='flex items-baseline justify-between gap-2 text-[11px] text-slate-400'>
                <span>{label}</span>
                <span className='truncate font-mono text-slate-500'>{sub}</span>
            </div>
            <p className='mt-1 font-display text-lg font-semibold tabular-nums text-white'>{value}</p>
            <div className='meter mt-2 h-1.5' data-level={pct > 90 ? 'crit' : pct > 75 ? 'warn' : 'ok'}>
                <div className='meter-fill' style={{ width: `${clamp(pct, 0, 100)}%` }} />
            </div>
        </div>
    );
}

/** Cabecera común a todas las pestañas: identidad, estado y consumo en vivo. */
export default function ServerHeader() {
    const server = ServerContext.useStoreState((state) => state.server.data);
    const power = ServerContext.useStoreState((state) => state.status.value);
    const stats = ServerContext.useStoreState((state) => state.stats.current);

    if (!server) {
        return <div className='glass h-[168px] animate-pulse rounded-3xl' />;
    }

    const state = resolveState(power, server.status);
    const primary = server.allocations.find((a) => a.isDefault) ?? server.allocations[0];
    const address = `${primary.alias ?? primary.ip}:${primary.port}`;
    const cpu = stats ? (stats.cpu_absolute / server.limits.cpu) * 100 : 0;
    const memory = stats?.memory_bytes ?? 0;
    const memoryLimit = mibToBytes(server.limits.memory);

    return (
        <section className='glass spotlight relative rounded-3xl p-5 sm:p-6' aria-labelledby='server-name'>
            <div className='pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]' aria-hidden='true'>
                <div className='absolute -right-24 -top-28 h-80 w-80 rounded-full transition-[background] duration-700' style={{ background: `radial-gradient(closest-side, ${GLOW[state]}, transparent)` }} />
                <div className='absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,.22),transparent)]' />
            </div>

            <div className='relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between'>
                <div className='flex min-w-0 items-start gap-4'>
                    <div className='icon-tile h-14 w-14 rounded-2xl from-emerald-400 via-green-500 to-lime-500 text-white ring-white/25 shadow-[0_12px_32px_-10px_rgba(52,211,153,.6)] sm:h-16 sm:w-16'>
                        <Icon name='box' className='h-7 w-7 sm:h-8 sm:w-8' />
                    </div>
                    <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
                            <h1 id='server-name' className='truncate font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl'>
                                {server.name}
                            </h1>
                            <StatusPill state={state} />
                        </div>
                        <p className='mt-1 line-clamp-2 text-sm text-slate-400'>{server.description}</p>
                        <div className='mt-4 flex flex-wrap gap-2'>
                            <CopyButton text={address} />
                            <span className='chip'>
                                <Icon name='server' className='h-3.5 w-3.5 text-violet-300' />
                                {server.node}
                            </span>
                            <span className='chip'>
                                <Icon name='layers' className='h-3.5 w-3.5 text-fuchsia-300' />
                                {server.egg.name} · {server.egg.nest}
                            </span>
                            <span className={cx('chip', state !== 'running' && 'text-slate-500')}>
                                <Icon name='clock' className='h-3.5 w-3.5 text-cyan-300' />
                                <span className='font-mono'>{stats?.uptime ? formatUptime(stats.uptime) : '—'}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className='grid grid-cols-2 gap-3 lg:w-[22rem] lg:shrink-0'>
                    <MiniMeter label='CPU' value={`${cpu.toFixed(1)} %`} sub={`de ${server.limits.cpu} %`} pct={cpu} />
                    <MiniMeter label='Memoria' value={bytesToString(memory)} sub={`de ${bytesToString(memoryLimit, 0)}`} pct={(memory / memoryLimit) * 100} />
                </div>
            </div>
        </section>
    );
}
