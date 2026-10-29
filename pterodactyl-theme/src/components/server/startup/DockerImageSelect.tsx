import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Icon from '@/components/elements/Icon';
import { cx } from '@/lib/format';

interface Props {
    images: Record<string, string>;
    value: string;
    onChange: (image: string) => void;
    disabled?: boolean;
}

/** Selector de imagen Docker con lista flotante de cristal y navegación por teclado. */
export default function DockerImageSelect({ images, value, onChange, disabled }: Props) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const root = useRef<HTMLDivElement>(null);
    const entries = Object.entries(images);
    const current = entries.find(([, img]) => img === value);

    useEffect(() => {
        if (!open) return;
        setActive(Math.max(0, entries.findIndex(([, img]) => img === value)));
        const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
        document.addEventListener('pointerdown', onDown);
        return () => document.removeEventListener('pointerdown', onDown);
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const onKeyDown = (e: KeyboardEvent) => {
        if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
            e.preventDefault();
            setOpen(true);
        } else if (open && e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % entries.length);
        } else if (open && e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i - 1 + entries.length) % entries.length);
        } else if (open && e.key === 'Enter') {
            e.preventDefault();
            onChange(entries[active][1]);
            setOpen(false);
        } else if (e.key === 'Escape') setOpen(false);
    };

    return (
        <div ref={root} className='relative'>
            <button
                type='button'
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={onKeyDown}
                aria-haspopup='listbox'
                aria-expanded={open}
                className='glass-input flex items-center justify-between gap-3 text-left'
            >
                <span className='min-w-0'>
                    <span className='block text-sm font-medium text-white'>{current?.[0] ?? 'Imagen personalizada'}</span>
                    <span className='block truncate font-mono text-[11px] text-slate-400'>{value}</span>
                </span>
                <Icon name='chevron-down' className={cx('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <ul role='listbox' className='glass-pop absolute inset-x-0 top-full z-30 mt-2 animate-pop-in p-1.5'>
                    {entries.map(([label, image], i) => (
                        <li
                            key={image}
                            role='option'
                            aria-selected={image === value}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => {
                                onChange(image);
                                setOpen(false);
                            }}
                            className={cx('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2', i === active && 'bg-white/10')}
                        >
                            <span className='icon-tile h-8 w-8 from-orange-400/30 to-rose-500/10 text-orange-200 ring-orange-300/25'>
                                <Icon name='coffee' className='h-4 w-4' />
                            </span>
                            <span className='min-w-0 flex-1'>
                                <span className='block text-sm text-white'>{label}</span>
                                <span className='block truncate font-mono text-[11px] text-slate-400'>{image}</span>
                            </span>
                            {image === value && <Icon name='check' className='h-4 w-4 text-fuchsia-300' />}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
