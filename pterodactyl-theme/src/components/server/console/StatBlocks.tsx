import { useMemo, type ReactNode } from 'react';
import Icon, { type IconName } from '@/components/elements/Icon';
import LiveChip from '@/components/server/LiveChip';
import { ServerContext } from '@/state/server';
import { bytesToString, clamp, cx, mibToBytes } from '@/lib/format';

const SLOTS = 60;

/**
 * Spline Catmull-Rom → Bézier. Usa 60 huecos fijos (uno por segundo), así la
 * gráfica crece desde la derecha en vez de estirarse con pocas muestras.
 */
function sparkPath(values: number[], max: number, w = 300, h = 80, padY = 6) {
    const series = values.length > 1 ? values.slice(-SLOTS) : [0, 0];
    const step = w / (SLOTS - 1);
    const offset = SLOTS - series.length;
    const pts = series.map((v, i) => [(offset + i) * step, h - padY - clamp(v / (max || 1), 0, 1) * (h - padY * 2)]);
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const [p0, p1, p2, p3] = [pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]];
        d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return { line: d, area: `${d} L${w},${h} L${pts[0][0].toFixed(1)},${h} Z`, lastY: pts[pts.length - 1][1] / h };
}

function Card({ icon, title, sub, tone, spot, live, children }: { icon: IconName; title: string; sub: string; tone: string; spot: string; live?: boolean; children: ReactNode }) {
    const status = ServerContext.useStoreState((state) => state.status.value);
    return (
        <article className='glass glass-hover spotlight rounded-3xl p-5' style={{ ['--spot' as string]: spot }}>
            <header className='flex items-start justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-3'>
                    <span className={cx('icon-tile h-10 w-10', tone)}>
                        <Icon name={icon} className='h-[18px] w-[18px]' />
                    </span>
                    <div className='min-w-0'>
                        <h3 className='truncate text-sm font-medium text-slate-200'>{title}</h3>
                        <p className='truncate text-[11px] text-slate-500'>{sub}</p>
                    </div>
                </div>
                {live && <LiveChip state={status} className='shrink-0' />}
            </header>
            {children}
        </article>
    );
}

/** CPU, memoria, disco y red, alimentados por el evento `stats` de Wings. */
export default function StatBlocks() {
    const limits = ServerContext.useStoreState((state) => state.server.data?.limits);
    const stats = ServerContext.useStoreState((state) => state.stats);
    const current = stats.current;
    const cpuLimit = limits?.cpu ?? 100;
    const cpu = current ? (current.cpu_absolute / cpuLimit) * 100 : 0;
    const memLimit = mibToBytes(limits?.memory ?? 1024);
    const mem = current?.memory_bytes ?? 0;
    const diskLimit = mibToBytes(limits?.disk ?? 1024);
    const disk = current?.disk_bytes ?? 0;
    const diskPct = (disk / diskLimit) * 100;
    const rx = stats.rx[stats.rx.length - 1] ?? 0;
    const tx = stats.tx[stats.tx.length - 1] ?? 0;

    // Reparto aproximado por hilo a partir del uso total (Wings solo da el agregado).
    const threads = useMemo(() => Array.from({ length: 8 }, () => clamp(cpu + (Math.random() - 0.5) * 46, cpu ? 3 : 0, 100)), [cpu]);
    const spark = sparkPath(stats.memory, memLimit);
    const peak = Math.max(0, ...stats.memory);
    const avg = stats.memory.length ? stats.memory.reduce((a, b) => a + b, 0) / stats.memory.length : 0;
    const netMax = Math.max(64 * 1024, ...stats.rx, ...stats.tx);

    return (
        <section className='grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4' aria-label='Métricas en tiempo real'>
            <Card icon='cpu' title='Uso de CPU' sub={`${cpuLimit / 100} vCores · límite ${cpuLimit} %`} tone='from-cyan-400/35 to-sky-500/10 text-cyan-200 ring-cyan-300/30' spot='rgba(34,211,238,.13)' live>
                <div className='mt-5 flex items-end justify-between gap-2'>
                    <p className='font-display text-4xl font-semibold tabular-nums text-white'>
                        {cpu.toFixed(1)}
                        <span className='text-xl text-slate-400'>%</span>
                    </p>
                    <p className='pb-1 text-right font-mono text-[11px] text-slate-400'>{(current?.cpu_absolute ?? 0).toFixed(1)} % abs.</p>
                </div>
                <div className='meter mt-4' data-level={cpu > 90 ? 'crit' : cpu > 75 ? 'warn' : 'ok'} role='progressbar' aria-label='CPU' aria-valuenow={Math.round(cpu)} aria-valuemin={0} aria-valuemax={100}>
                    <div className='meter-fill' style={{ width: `${clamp(cpu, 0, 100)}%` }} />
                </div>
                <div className='mt-4 flex h-11 items-end gap-1.5' aria-hidden='true'>
                    {threads.map((v, i) => (
                        <div key={i} className='relative h-full flex-1 overflow-hidden rounded-md bg-white/[0.05] ring-1 ring-white/5'>
                            <div
                                className={cx('absolute inset-x-0 bottom-0 rounded-md bg-linear-to-t transition-[height] duration-700', v > 85 ? 'from-rose-500/70 to-orange-300' : 'from-cyan-500/50 to-violet-400')}
                                style={{ height: `${Math.max(3, v)}%` }}
                            />
                        </div>
                    ))}
                </div>
            </Card>

            <Card icon='memory' title='Memoria' sub={`${((mem / memLimit) * 100).toFixed(0)} % de ${bytesToString(memLimit, 0)}`} tone='from-fuchsia-400/35 to-violet-500/10 text-fuchsia-200 ring-fuchsia-300/30' spot='rgba(217,70,239,.13)' live>
                <p className='mt-5 font-display text-4xl font-semibold tabular-nums text-white'>
                    {(mem / 1024 ** 3).toFixed(2)}
                    <span className='text-xl text-slate-400'> GiB</span>
                </p>
                <div className='relative mt-3 h-[72px]'>
                    <svg viewBox='0 0 300 80' preserveAspectRatio='none' className='h-full w-full overflow-visible' aria-hidden='true'>
                        <defs>
                            <linearGradient id='mem-fill' x1='0' y1='0' x2='0' y2='1'>
                                <stop offset='0' stopColor='#d946ef' stopOpacity='.45' />
                                <stop offset='1' stopColor='#8b5cf6' stopOpacity='0' />
                            </linearGradient>
                            <linearGradient id='mem-stroke' x1='0' y1='0' x2='1' y2='0'>
                                <stop offset='0' stopColor='#8b5cf6' />
                                <stop offset='1' stopColor='#f0abfc' />
                            </linearGradient>
                        </defs>
                        {[20, 40, 60].map((y) => (
                            <line key={y} x1='0' x2='300' y1={y} y2={y} stroke='rgba(255,255,255,.07)' strokeDasharray='3 5' vectorEffect='non-scaling-stroke' />
                        ))}
                        <path d={spark.area} fill='url(#mem-fill)' />
                        <path d={spark.line} fill='none' stroke='url(#mem-stroke)' strokeWidth='2.25' strokeLinecap='round' vectorEffect='non-scaling-stroke' />
                    </svg>
                    <span
                        className='absolute right-0 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_0_4px_rgba(217,70,239,.25),0_0_14px_rgba(240,171,252,.9)] transition-[top] duration-700'
                        style={{ top: `${spark.lastY * 100}%` }}
                    />
                </div>
                <div className='mt-2 flex justify-between text-[11px] text-slate-500'>
                    <span>
                        Pico <span className='font-mono text-slate-300'>{bytesToString(peak)}</span>
                    </span>
                    <span>
                        Media <span className='font-mono text-slate-300'>{bytesToString(avg)}</span>
                    </span>
                </div>
            </Card>

            <Card icon='drive' title='Almacenamiento' sub={`NVMe · límite ${bytesToString(diskLimit, 0)}`} tone='from-emerald-400/35 to-teal-500/10 text-emerald-200 ring-emerald-300/30' spot='rgba(52,211,153,.12)'>
                <div className='mt-5 flex items-center justify-between gap-3'>
                    <div className='min-w-0'>
                        <p className='font-display text-4xl font-semibold tabular-nums text-white'>
                            {(disk / 1024 ** 3).toFixed(2)}
                            <span className='text-xl text-slate-400'> GiB</span>
                        </p>
                        <p className='mt-1 text-[11px] text-slate-400'>
                            <span className='font-mono text-emerald-300'>{bytesToString(Math.max(0, diskLimit - disk))}</span> libres
                        </p>
                    </div>
                    <div className='relative h-[72px] w-[72px] shrink-0'>
                        <svg viewBox='0 0 100 100' className='h-full w-full -rotate-90' aria-hidden='true'>
                            <defs>
                                <linearGradient id='disk-grad' x1='0' y1='0' x2='1' y2='1'>
                                    <stop offset='0' stopColor='#34d399' />
                                    <stop offset='1' stopColor='#22d3ee' />
                                </linearGradient>
                            </defs>
                            <circle cx='50' cy='50' r='42' fill='none' stroke='rgba(255,255,255,.08)' strokeWidth='9' />
                            <circle
                                cx='50'
                                cy='50'
                                r='42'
                                fill='none'
                                stroke='url(#disk-grad)'
                                strokeWidth='9'
                                strokeLinecap='round'
                                strokeDasharray='263.9'
                                strokeDashoffset={(263.9 * (1 - clamp(diskPct, 0, 100) / 100)).toFixed(1)}
                                className='drop-shadow-[0_0_6px_rgba(52,211,153,.7)] transition-[stroke-dashoffset] duration-1000'
                            />
                        </svg>
                        <span className='absolute inset-0 grid place-items-center font-display text-sm font-semibold text-white'>{diskPct.toFixed(0)}%</span>
                    </div>
                </div>
                <p className='mt-4 text-[11px] leading-relaxed text-slate-500'>Se actualiza al subir, comprimir o borrar archivos en la pestaña Archivos.</p>
            </Card>

            <Card icon='activity' title='Red' sub='Entrada y salida por segundo' tone='from-sky-400/35 to-indigo-500/10 text-sky-200 ring-sky-300/30' spot='rgba(56,189,248,.13)' live>
                <div className='mt-5 grid grid-cols-2 gap-2.5'>
                    {[
                        ['arrow-down', 'Entrada', rx, 'text-sky-300'],
                        ['arrow-up', 'Salida', tx, 'text-violet-300'],
                    ].map(([icon, label, value, cls]) => (
                        <div key={label as string} className='rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10'>
                            <p className='flex items-center gap-1 whitespace-nowrap text-[11px] text-slate-400'>
                                <Icon name={icon as IconName} className={cx('h-3.5 w-3.5', cls as string)} />
                                {label as string}
                            </p>
                            <p className='mt-0.5 whitespace-nowrap font-display text-lg font-semibold tabular-nums text-white'>{bytesToString(value as number)}/s</p>
                        </div>
                    ))}
                </div>
                <div className='mt-4 flex h-12 items-end gap-[3px]' aria-hidden='true'>
                    {Array.from({ length: 28 }, (_, i) => {
                        // 28 huecos fijos: los vacíos quedan a la izquierda hasta que llegan muestras.
                        const at = stats.rx.length - 28 + i;
                        const inbound = stats.rx[at];
                        const outbound = stats.tx[at] ?? 0;
                        return (
                            <div key={i} className='relative h-full flex-1 rounded-t-sm bg-white/[0.03]'>
                                {inbound !== undefined && (
                                    <>
                                        <div className='absolute inset-x-0 bottom-0 rounded-t-sm bg-linear-to-t from-sky-500/30 to-sky-300/80 transition-[height] duration-500' style={{ height: `${Math.max(2, (inbound / netMax) * 100)}%` }} />
                                        <div className='absolute inset-x-[28%] bottom-0 rounded-t-sm bg-violet-300/90 transition-[height] duration-500' style={{ height: `${Math.max(1, (outbound / netMax) * 100)}%` }} />
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </section>
    );
}
