import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon, { type IconName } from '@/components/elements/Icon';
import { cx } from '@/lib/format';

export type MenuItem =
    | { label: string; icon?: IconName; onSelect: () => void; danger?: boolean; disabled?: boolean; hint?: string }
    | 'divider';

export type MenuAnchor = DOMRect | { x: number; y: number };

interface FloatingMenuProps {
    anchor: MenuAnchor | null;
    onClose: () => void;
    items: MenuItem[];
    header?: ReactNode;
    align?: 'left' | 'right';
}

/**
 * Menú flotante de cristal. Se coloca junto a un botón (DOMRect) o en la
 * posición del cursor (clic derecho) y se da la vuelta si no cabe debajo.
 */
export default function FloatingMenu({ anchor, onClose, items, header, align = 'right' }: FloatingMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const [active, setActive] = useState(-1);

    useLayoutEffect(() => {
        if (!anchor || !ref.current) return;
        const menu = ref.current.getBoundingClientRect();
        const isRect = 'width' in anchor;
        const x = isRect ? (align === 'right' ? anchor.right - menu.width : anchor.left) : anchor.x;
        const below = isRect ? anchor.bottom + 6 : anchor.y + 2;
        const above = (isRect ? anchor.top - 6 : anchor.y - 2) - menu.height;
        const top = below + menu.height > window.innerHeight - 8 && above > 8 ? above : below;
        setPos({ top: Math.max(8, top), left: Math.min(Math.max(8, x), window.innerWidth - menu.width - 8) });
    }, [anchor, align]);

    useEffect(() => {
        if (!anchor) {
            setPos(null);
            setActive(-1);
            return;
        }
        const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
        const onKey = (e: KeyboardEvent) => {
            const enabled = items.map((it, i) => (it !== 'divider' && !it.disabled ? i : -1)).filter((i) => i >= 0);
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const at = enabled.indexOf(active);
                const next = e.key === 'ArrowDown' ? enabled[(at + 1) % enabled.length] : enabled[(at - 1 + enabled.length) % enabled.length];
                setActive(next ?? -1);
            } else if (e.key === 'Enter' && active >= 0) {
                e.preventDefault();
                const item = items[active];
                if (item !== 'divider') {
                    onClose();
                    item.onSelect();
                }
            }
        };
        const onScroll = () => onClose();
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('keydown', onKey, true);
        window.addEventListener('resize', onScroll);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('pointerdown', onDown, true);
            document.removeEventListener('keydown', onKey, true);
            window.removeEventListener('resize', onScroll);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [anchor, items, active, onClose]);

    if (!anchor) return null;

    return createPortal(
        <div
            ref={ref}
            role='menu'
            className={cx('glass-pop fixed z-[95] w-56 p-1.5', pos ? 'animate-pop-in' : 'invisible')}
            style={pos ?? { top: 0, left: 0 }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {header && <div className='border-b border-white/10 px-2.5 pb-2 pt-1.5'>{header}</div>}
            {items.map((item, i) =>
                item === 'divider' ? (
                    <div key={`d${i}`} className='my-1 h-px bg-white/10' />
                ) : (
                    <button
                        key={item.label}
                        role='menuitem'
                        disabled={item.disabled}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => {
                            onClose();
                            item.onSelect();
                        }}
                        className={cx(
                            'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition disabled:cursor-not-allowed disabled:opacity-40',
                            item.danger ? 'text-rose-300' : 'text-slate-200',
                            active === i && (item.danger ? 'bg-rose-500/15 text-rose-200' : 'bg-white/10 text-white'),
                        )}
                    >
                        {item.icon && <Icon name={item.icon} className='h-4 w-4 shrink-0 opacity-80' />}
                        <span className='flex-1 truncate'>{item.label}</span>
                        {item.hint && <span className='kbd'>{item.hint}</span>}
                    </button>
                ),
            )}
        </div>,
        document.getElementById('modal-portal') ?? document.body,
    );
}
