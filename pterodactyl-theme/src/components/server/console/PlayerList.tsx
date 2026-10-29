import { useEffect, useState } from 'react';
import Icon, { type IconName } from '@/components/elements/Icon';
import { Input } from '@/components/elements/Field';
import { useToast } from '@/components/elements/Toast';
import { SocketRequest } from '@/socket/events';
import { ServerContext } from '@/state/server';
import { cx, hashHue, relativeTime } from '@/lib/format';

/** Lista lateral de jugadores conectados. */
export default function PlayerList() {
    const players = ServerContext.useStoreState((state) => state.console.players);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const max = ServerContext.useStoreState((state) => state.server.data?.maxPlayers ?? 0);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);
    const actions = ServerContext.useStoreActions();
    const toast = useToast();
    const [query, setQuery] = useState('');
    const [, setNow] = useState(0);

    // Refresca el «conectado hace…» cada 30 s.
    useEffect(() => {
        const t = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(t);
    }, []);

    const run = (command: string, message: string) => {
        instance?.send(SocketRequest.SEND_COMMAND, command);
        actions.appendLines([{ type: 'command', text: command }]);
        toast({ title: message, tone: 'info' });
    };

    const visible = [...players].reverse().filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    const empty: [IconName, string, string] | null =
        status !== 'running'
            ? ['power', status === 'starting' ? 'Iniciando servidor…' : 'Servidor apagado', 'Los jugadores aparecerán cuando el servidor esté en marcha.']
            : !players.length
              ? ['users', 'Nadie conectado todavía', 'Las conexiones aparecen aquí en tiempo real.']
              : null;

    return (
        <section className='glass glass-hover spotlight flex min-h-0 flex-col rounded-3xl p-5' aria-labelledby='players-title'>
            <header className='flex items-center justify-between gap-3'>
                <h3 id='players-title' className='flex items-center gap-2 text-sm font-semibold text-white'>
                    <Icon name='users' className='h-4 w-4 text-fuchsia-300' />
                    Jugadores en línea
                </h3>
                <span className='rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11px] text-slate-200'>
                    {players.length}/{max}
                </span>
            </header>
            <div className='meter mt-3 h-1.5'>
                <div className='meter-fill' style={{ width: `${max ? (players.length / max) * 100 : 0}%` }} />
            </div>

            {players.length > 6 && (
                <div className='relative mt-3'>
                    <Icon name='search' className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500' />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Buscar jugador…' className='py-2 pl-9 text-[13px]' aria-label='Buscar jugador' />
                </div>
            )}

            {empty ? (
                <div className='flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center'>
                    <span className='grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.05] text-slate-500 ring-1 ring-white/10'>
                        <Icon name={empty[0]} className='h-5 w-5' />
                    </span>
                    <span className='text-sm text-slate-300'>{empty[1]}</span>
                    <span className='text-xs text-slate-500'>{empty[2]}</span>
                </div>
            ) : (
                <ul className='scroll-thin -mx-2 mt-3 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1 pb-2 [mask-image:linear-gradient(to_bottom,#000_88%,transparent)] xl:max-h-[27rem]'>
                    {visible.map((p) => {
                        const hue = hashHue(p.name);
                        const level = p.ping < 60 ? 3 : p.ping < 110 ? 2 : 1;
                        const tone = level === 3 ? 'bg-emerald-400' : level === 2 ? 'bg-amber-400' : 'bg-rose-400';
                        return (
                            <li key={p.name} className='group flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.06]'>
                                <span
                                    className='grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white ring-1 ring-white/20'
                                    style={{ background: `linear-gradient(135deg,hsl(${hue} 75% 58%),hsl(${(hue + 50) % 360} 70% 42%))` }}
                                >
                                    {p.name.slice(0, 2).toUpperCase()}
                                </span>
                                <span className='min-w-0 flex-1'>
                                    <span className='block truncate text-[13px] text-slate-200'>{p.name}</span>
                                    <span className='block text-[11px] text-slate-500'>conectado {relativeTime(new Date(p.joinedAt))}</span>
                                </span>
                                <span className='flex items-end gap-0.5 group-hover:hidden' title={`${p.ping} ms`}>
                                    {[1, 2, 3].map((b) => (
                                        <span key={b} className={cx('w-[3px] rounded-sm', b <= level ? tone : 'bg-white/15')} style={{ height: b * 4 + 2 }} />
                                    ))}
                                    <span className='ml-1.5 w-10 text-right font-mono text-[11px] text-slate-400'>{p.ping} ms</span>
                                </span>
                                <span className='hidden items-center gap-0.5 group-hover:flex'>
                                    <button onClick={() => run(`op ${p.name}`, `${p.name} ahora es operador`)} className='grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-violet-500/20 hover:text-violet-200' title='Dar OP' aria-label={`Dar OP a ${p.name}`}>
                                        <Icon name='star' className='h-3.5 w-3.5' />
                                    </button>
                                    <button onClick={() => run(`kick ${p.name}`, `${p.name} ha sido expulsado`)} className='grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-200' title='Expulsar' aria-label={`Expulsar a ${p.name}`}>
                                        <Icon name='user-x' className='h-3.5 w-3.5' />
                                    </button>
                                </span>
                            </li>
                        );
                    })}
                    {!visible.length && <li className='px-2 py-6 text-center text-xs text-slate-500'>Ningún jugador coincide con «{query}».</li>}
                </ul>
            )}
            <p className='mt-2 border-t border-white/10 pt-3 text-[11px] text-slate-500'>Detectados en directo a partir de la consola.</p>
        </section>
    );
}
