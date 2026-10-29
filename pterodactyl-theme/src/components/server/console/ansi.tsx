import type { ReactNode } from 'react';

const FG: Record<number, string> = {
    30: 'text-slate-500', 31: 'text-rose-400', 32: 'text-emerald-400', 33: 'text-amber-300', 34: 'text-sky-400', 35: 'text-fuchsia-400', 36: 'text-cyan-300', 37: 'text-slate-200',
    90: 'text-slate-500', 91: 'text-rose-300', 92: 'text-emerald-300', 93: 'text-yellow-200', 94: 'text-sky-300', 95: 'text-fuchsia-300', 96: 'text-cyan-200', 97: 'text-white',
};
const BG: Record<number, string> = { 41: 'bg-rose-600/70 text-white', 42: 'bg-emerald-600/60', 43: 'bg-amber-500/60', 44: 'bg-sky-600/60', 45: 'bg-fuchsia-600/60', 46: 'bg-cyan-600/60' };

/** Convierte secuencias SGR (colores y negrita) en spans: lo que manda Wings. */
export function renderAnsi(text: string): ReactNode[] {
    const out: ReactNode[] = [];
    let fg = '';
    let bg = '';
    let bold = false;
    text.split(/\x1b\[([\d;]*)m/).forEach((chunk, i) => {
        if (i % 2 === 1) {
            for (const code of (chunk || '0').split(';').map(Number)) {
                if (code === 0) [fg, bg, bold] = ['', '', false];
                else if (code === 1) bold = true;
                else if (code === 22) bold = false;
                else if (code === 39) fg = '';
                else if (code === 49) bg = '';
                else if (FG[code]) fg = FG[code];
                else if (BG[code]) bg = BG[code];
            }
        } else if (chunk) {
            out.push(
                <span key={i} className={[fg, bg, bold && 'font-semibold'].filter(Boolean).join(' ') || undefined}>
                    {chunk}
                </span>,
            );
        }
    });
    return out;
}

const MC = /^\[(\d{2}:\d{2}:\d{2}) (INFO|WARN|ERROR)\]: (.*)$/s;
const LEVEL = { INFO: 'text-sky-400', WARN: 'text-amber-400', ERROR: 'text-rose-400' } as const;

/** Resaltado semántico para logs de Minecraft cuando no traen colores ANSI. */
export function renderMinecraft(text: string): ReactNode {
    const m = MC.exec(text);
    if (!m) {
        if (/^(Error|\tjava\.|Exception|Caused by)/.test(text)) return <span className='text-rose-300'>{text}</span>;
        return <span className='text-slate-400'>{text}</span>;
    }
    const [, time, level, msg] = m as unknown as [string, string, keyof typeof LEVEL, string];
    let body: ReactNode = msg;
    let cls = level === 'WARN' ? 'text-amber-200' : level === 'ERROR' ? 'text-rose-300' : 'text-slate-300';
    const chat = /^<([A-Za-z0-9_]{3,16})> (.*)$/.exec(msg);
    if (chat) {
        cls = 'text-slate-100';
        body = (
            <>
                &lt;<span className='text-fuchsia-300'>{chat[1]}</span>&gt; {chat[2]}
            </>
        );
    } else if (/^\[Server\] /.test(msg)) cls = 'text-violet-200';
    else if (/(joined|left) the game$/.test(msg)) cls = 'text-yellow-200/90';
    else if (/^Done \(/.test(msg) || /^Saved the game$/.test(msg)) cls = 'text-emerald-300';
    else if (/has made the advancement/.test(msg)) cls = 'text-cyan-200';

    return (
        <>
            <span className='text-slate-500'>
                [{time} <span className={LEVEL[level]}>{level}</span>]:
            </span>{' '}
            <span className={cls}>{body}</span>
        </>
    );
}
