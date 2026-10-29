import { memo, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import Icon from '@/components/elements/Icon';
import LiveChip from '@/components/server/LiveChip';
import PowerButtons from '@/components/server/console/PowerButtons';
import { renderAnsi, renderMinecraft } from '@/components/server/console/ansi';
import { SocketRequest } from '@/socket/events';
import { ServerContext, type ConsoleLine } from '@/state/server';
import { cx } from '@/lib/format';

const COMMANDS = ['help', 'list', 'say', 'kick', 'op', 'time set day', 'time set night', 'weather clear', 'save-all', 'tps', 'version', 'stop'];
const QUICK = ['list', 'tps', 'save-all'];

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PRELUDE = <span className='font-semibold text-amber-300'>container@pterodactyl~</span>;

function lineContent(line: ConsoleLine) {
    switch (line.type) {
        case 'daemon':
            return (
                <>
                    {PRELUDE} <span className='text-slate-100'>{line.text}</span>
                </>
            );
        case 'error':
            return (
                <>
                    {PRELUDE} <span className='rounded bg-rose-600/60 px-1 font-semibold text-white'>{line.text}</span>
                </>
            );
        case 'install':
            return <span className='text-sky-200/90'>{line.text}</span>;
        case 'command':
            return (
                <>
                    <span className='text-fuchsia-400'>❯</span> <span className='text-fuchsia-100'>{line.text}</span>
                </>
            );
        default:
            return line.text.includes('\x1b[') ? renderAnsi(line.text) : renderMinecraft(line.text);
    }
}

// La animación de entrada usa la Web Animations API para que no se repita
// cada vez que la pestaña oculta vuelve a mostrarse (las animaciones CSS sí lo harían).
const Line = memo(function Line({ line }: { line: ConsoleLine }) {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (!reducedMotion) ref.current?.animate([{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
    }, []);
    return <div ref={ref}>{lineContent(line)}</div>;
});

/**
 * Terminal glass. En el panel real la consola es xterm.js; este componente
 * puede sustituirla o puedes quedarte con xterm y usar el tema de theme/xterm.ts.
 */
export default function Console() {
    const lines = ServerContext.useStoreState((state) => state.console.lines);
    const players = ServerContext.useStoreState((state) => state.console.players);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const installing = ServerContext.useStoreState((state) => state.server.data?.status === 'installing');
    const node = ServerContext.useStoreState((state) => state.server.data?.node);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);
    const actions = ServerContext.useStoreActions();

    const out = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const stick = useRef(true);
    const seen = useRef(0);
    const [autoscroll, setAutoscroll] = useState(true);
    const [unread, setUnread] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const canSend = !installing && (status === 'running' || status === 'starting');

    const toBottom = () => {
        if (!out.current) return;
        out.current.scrollTop = out.current.scrollHeight;
        stick.current = true;
        setUnread(0);
    };

    // Nuevas líneas: baja al final si el usuario no se ha movido hacia arriba.
    useLayoutEffect(() => {
        const added = Math.max(0, lines.length - seen.current);
        seen.current = lines.length;
        if (autoscroll && stick.current) toBottom();
        else if (added) setUnread((n) => n + added);
    }, [lines, autoscroll]);

    // La pestaña oculta mide 0 px; al volver a mostrarse se recoloca al final.
    useEffect(() => {
        const el = out.current;
        if (!el) return;
        const ro = new ResizeObserver(() => autoscroll && stick.current && toBottom());
        ro.observe(el);
        return () => ro.disconnect();
    }, [autoscroll]);

    useEffect(() => {
        if (!expanded) return;
        const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setExpanded(false);
        const collapse = () => setExpanded(false);
        document.addEventListener('keydown', onKey);
        window.addEventListener('hashchange', collapse);
        document.body.style.overflow = 'hidden';
        input.current?.focus();
        return () => {
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('hashchange', collapse);
            document.body.style.overflow = '';
        };
    }, [expanded]);

    const send = (command: string) => {
        const cmd = command.trim();
        if (!cmd || !canSend) return;
        instance?.send(SocketRequest.SEND_COMMAND, cmd);
        actions.appendLines([{ type: 'command', text: cmd }]);
        setHistory((h) => [cmd, ...h.filter((x) => x !== cmd)].slice(0, 32));
        setHistoryIndex(-1);
        stick.current = true;
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        const el = e.currentTarget;
        if (e.key === 'Enter') {
            send(el.value);
            el.value = '';
        } else if (e.key === 'ArrowUp' && history.length) {
            e.preventDefault();
            const i = Math.min(history.length - 1, historyIndex + 1);
            setHistoryIndex(i);
            el.value = history[i];
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const i = Math.max(-1, historyIndex - 1);
            setHistoryIndex(i);
            el.value = i < 0 ? '' : history[i];
        } else if (e.key === 'Tab' && el.value) {
            // Autocompleta comandos y, a partir de la segunda palabra, jugadores.
            const parts = el.value.split(' ');
            const last = parts[parts.length - 1].toLowerCase();
            const pool = parts.length === 1 ? COMMANDS : players.map((p) => p.name);
            const match = last && pool.find((c) => c.toLowerCase().startsWith(last));
            if (match) {
                e.preventDefault();
                parts[parts.length - 1] = match;
                el.value = parts.join(' ') + (parts.length === 1 && !match.includes(' ') ? ' ' : '');
            }
        }
    };

    return (
        <>
            <div
                className={cx('fixed inset-0 z-[70] bg-[#05030f]/70 backdrop-blur-sm transition-opacity duration-300', expanded ? 'opacity-100' : 'pointer-events-none opacity-0')}
                onClick={() => setExpanded(false)}
                aria-hidden='true'
            />
            <section
                className={cx(
                    'glass-strong flex min-w-0 flex-col overflow-hidden rounded-3xl transition-[border-color] duration-500 hover:border-white/20',
                    expanded && 'fixed inset-3 z-[75] sm:inset-6',
                )}
                aria-label='Consola del servidor'
            >
                {/* Barra superior */}
                <div className='flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5'>
                    <div className='hidden gap-1.5 sm:flex' aria-hidden='true'>
                        <span className='h-3 w-3 rounded-full bg-rose-400/80 shadow-[0_0_8px_rgba(251,113,133,.6)]' />
                        <span className='h-3 w-3 rounded-full bg-amber-300/80 shadow-[0_0_8px_rgba(252,211,77,.6)]' />
                        <span className='h-3 w-3 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,.6)]' />
                    </div>
                    <div className='flex min-w-0 items-center gap-2 text-sm'>
                        <Icon name='terminal' className='h-4 w-4 shrink-0 text-violet-300' />
                        <span className='font-medium text-white'>Consola</span>
                        <span className='hidden truncate font-mono text-xs text-slate-500 md:inline'>/home/container</span>
                    </div>
                    <LiveChip state={status} />
                    <div className='ml-auto flex items-center gap-0.5'>
                        <button
                            onClick={() => {
                                setAutoscroll((v) => !v);
                                if (!autoscroll) toBottom();
                            }}
                            aria-pressed={autoscroll}
                            className={cx('grid h-8 w-8 place-items-center rounded-lg transition', autoscroll ? 'bg-violet-500/20 text-violet-200' : 'text-slate-400 hover:bg-white/10 hover:text-white')}
                            title='Desplazamiento automático'
                            aria-label='Desplazamiento automático'
                        >
                            <Icon name='scroll-down' className='h-4 w-4' />
                        </button>
                        <button onClick={actions.clearConsole} className='grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white' title='Limpiar consola' aria-label='Limpiar consola'>
                            <Icon name='trash' className='h-4 w-4' />
                        </button>
                        <button
                            onClick={() => setExpanded((v) => !v)}
                            className='grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white'
                            title={expanded ? 'Reducir (Esc)' : 'Pantalla completa'}
                            aria-label={expanded ? 'Reducir consola' : 'Ampliar consola'}
                        >
                            <Icon name={expanded ? 'minimize' : 'maximize'} className='h-4 w-4' />
                        </button>
                    </div>
                    <PowerButtons className='w-full sm:w-auto' />
                </div>

                {/* Salida con líneas de escaneo y barrido */}
                <div className='scanlines relative flex min-h-0 flex-1 flex-col overflow-hidden'>
                    <div className='scan-beam' aria-hidden='true' />
                    <div
                        ref={out}
                        onScroll={(e) => {
                            const el = e.currentTarget;
                            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
                            if (stick.current) setUnread(0);
                        }}
                        className='terminal-out scroll-thin min-h-[22rem] flex-1 basis-0 overflow-y-auto bg-[#05030f]/55 px-4 py-3 font-mono text-[11.5px] leading-[1.75] text-slate-300 sm:min-h-[27rem] sm:text-[12.5px]'
                        role='log'
                        aria-label='Salida de la consola'
                    >
                        <div className='text-violet-300'>● Conectado a wings@{node ?? '…'} mediante websocket</div>
                        {lines.map((line) => (
                            <Line key={line.id} line={line} />
                        ))}
                    </div>
                    <div className='pointer-events-none absolute inset-x-0 top-0 h-6 bg-linear-to-b from-black/40 to-transparent' />
                    {unread > 0 && (
                        <button onClick={toBottom} className='glass-pop absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-violet-100 animate-pop-in'>
                            <Icon name='arrow-down' className='h-3.5 w-3.5' />
                            {unread} {unread === 1 ? 'línea nueva' : 'líneas nuevas'}
                        </button>
                    )}
                </div>

                {/* Entrada de comandos */}
                <div className='flex items-center gap-2 border-t border-white/10 bg-black/35 px-3 py-2.5'>
                    <span className='font-mono text-sm font-semibold text-fuchsia-400 drop-shadow-[0_0_6px_rgba(232,121,249,.8)]' aria-hidden='true'>
                        ❯
                    </span>
                    <label htmlFor='console-input' className='sr-only'>
                        Comando
                    </label>
                    <input
                        ref={input}
                        id='console-input'
                        autoComplete='off'
                        spellCheck={false}
                        disabled={!canSend}
                        onKeyDown={onKeyDown}
                        placeholder={canSend ? 'Escribe un comando…  (Tab autocompleta · ↑↓ historial)' : installing ? 'Instalando el servidor…' : 'El servidor está apagado'}
                        className='min-w-0 flex-1 bg-transparent font-mono text-[13px] text-slate-100 caret-fuchsia-400 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed'
                    />
                    <div className='hidden items-center gap-1.5 md:flex'>
                        {QUICK.map((cmd) => (
                            <button
                                key={cmd}
                                disabled={!canSend}
                                onClick={() => send(cmd)}
                                className='rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-slate-400 transition hover:border-fuchsia-300/40 hover:bg-fuchsia-400/10 hover:text-fuchsia-100 disabled:opacity-40'
                            >
                                {cmd}
                            </button>
                        ))}
                    </div>
                    <button
                        disabled={!canSend}
                        onClick={() => {
                            if (!input.current) return;
                            send(input.current.value);
                            input.current.value = '';
                            input.current.focus();
                        }}
                        className='grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_6px_18px_-6px_rgba(217,70,239,.8)] transition hover:brightness-110 disabled:opacity-40'
                        aria-label='Enviar comando'
                    >
                        <Icon name='enter' className='h-4 w-4' />
                    </button>
                </div>
            </section>
        </>
    );
}
