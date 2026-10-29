import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon, { type IconName } from '@/components/elements/Icon';
import Button, { type ButtonVariant } from '@/components/elements/Button';
import { cx } from '@/lib/format';

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' } as const;

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: ReactNode;
    description?: ReactNode;
    icon?: IconName;
    tone?: string;
    size?: keyof typeof SIZES;
    footer?: ReactNode;
    /** Evita cerrar con Esc o clic fuera (p. ej. mientras se guarda). */
    locked?: boolean;
    className?: string;
    children?: ReactNode;
}

/** Diálogo glass renderizado en #modal-portal, igual que el panel. */
export default function Modal({ open, onClose, title, description, icon, tone, size = 'sm', footer, locked, className, children }: ModalProps) {
    const [mounted, setMounted] = useState(open);
    const panel = useRef<HTMLDivElement>(null);
    const lastFocus = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (open) {
            lastFocus.current = document.activeElement as HTMLElement | null;
            setMounted(true);
            return;
        }
        const t = window.setTimeout(() => setMounted(false), 200);
        lastFocus.current?.focus?.();
        return () => window.clearTimeout(t);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !locked) {
                e.stopPropagation();
                onClose();
            }
        };
        document.addEventListener('keydown', onKey, true);
        document.body.style.overflow = 'hidden';
        window.requestAnimationFrame(() => {
            panel.current?.querySelector<HTMLElement>('[data-autofocus], input:not([disabled]), textarea:not([disabled]), button:not([disabled])')?.focus();
        });
        return () => {
            document.removeEventListener('keydown', onKey, true);
            document.body.style.overflow = '';
        };
    }, [open, locked, onClose]);

    if (!mounted) return null;

    return createPortal(
        <div className={cx('fixed inset-0 z-[90] flex items-end justify-center p-3 transition-opacity duration-200 sm:items-center sm:p-6', open ? 'opacity-100' : 'opacity-0')}>
            <div className='absolute inset-0 bg-[#05030f]/70 backdrop-blur-md' onClick={() => !locked && onClose()} aria-hidden='true' />
            <div
                ref={panel}
                role='dialog'
                aria-modal='true'
                className={cx(
                    'glass-pop relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col rounded-3xl transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] sm:max-h-[calc(100dvh-3rem)]',
                    SIZES[size],
                    open ? 'translate-y-0 scale-100' : 'translate-y-4 scale-[.98]',
                    className,
                )}
            >
                {(title || icon) && (
                    <div className='flex items-start gap-3 px-5 pb-1 pt-5 sm:px-6'>
                        {icon && (
                            <span className={cx('icon-tile h-10 w-10', tone ?? 'from-violet-400/35 to-fuchsia-500/10 text-violet-200 ring-violet-300/30')}>
                                <Icon name={icon} className='h-[18px] w-[18px]' />
                            </span>
                        )}
                        <div className='min-w-0 flex-1'>
                            {title && <h2 className='font-display text-lg font-semibold text-white'>{title}</h2>}
                            {description && <p className='mt-1 text-sm text-slate-400'>{description}</p>}
                        </div>
                        {!locked && (
                            <button onClick={onClose} className='-mr-2 -mt-1 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white' aria-label='Cerrar'>
                                <Icon name='x' className='h-4 w-4' />
                            </button>
                        )}
                    </div>
                )}
                {children && <div className='scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6'>{children}</div>}
                {footer && <div className='flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end sm:px-6'>{footer}</div>}
            </div>
        </div>,
        document.getElementById('modal-portal') ?? document.body,
    );
}

interface ConfirmProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: ReactNode;
    children?: ReactNode;
    confirm?: string;
    variant?: ButtonVariant;
    icon?: IconName;
    loading?: boolean;
}

/** Como Dialog.Confirm de Pterodactyl. */
export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirm = 'Continuar', variant = 'danger', icon = 'alert', loading }: ConfirmProps) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            icon={icon}
            locked={loading}
            tone={variant === 'danger' ? 'from-rose-400/35 to-rose-500/10 text-rose-200 ring-rose-300/30' : undefined}
            footer={
                <>
                    <Button variant='ghost' onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button variant={variant} onClick={onConfirm} loading={loading} data-autofocus>
                        {confirm}
                    </Button>
                </>
            }
        >
            {children && <div className='text-sm leading-relaxed text-slate-300'>{children}</div>}
        </Modal>
    );
}
