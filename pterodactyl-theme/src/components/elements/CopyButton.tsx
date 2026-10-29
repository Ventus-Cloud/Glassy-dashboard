import { useState } from 'react';
import Icon from '@/components/elements/Icon';
import { useToast } from '@/components/elements/Toast';
import { copyToClipboard, cx } from '@/lib/format';

/** Como CopyOnClick del panel, en forma de chip. */
export default function CopyButton({ text, label, className, mono = true }: { text: string; label?: string; className?: string; mono?: boolean }) {
    const toast = useToast();
    const [copied, setCopied] = useState(false);

    return (
        <button
            type='button'
            title='Copiar'
            onClick={async () => {
                const ok = await copyToClipboard(text);
                setCopied(ok);
                toast(ok ? { title: 'Copiado al portapapeles', description: text, tone: 'success' } : { title: 'No se pudo copiar', tone: 'error' });
                window.setTimeout(() => setCopied(false), 1500);
            }}
            className={cx('chip group transition hover:border-violet-300/40 hover:bg-violet-400/10 hover:text-white', className)}
        >
            <span className={cx('truncate', mono && 'font-mono')}>{label ?? text}</span>
            <Icon name={copied ? 'check' : 'copy'} className={cx('h-3.5 w-3.5 shrink-0 transition', copied ? 'text-emerald-300' : 'text-slate-500 group-hover:text-violet-200')} />
        </button>
    );
}
