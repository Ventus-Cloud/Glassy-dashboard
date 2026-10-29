import type { CSSProperties, ReactNode } from 'react';
import Icon, { type IconName } from '@/components/elements/Icon';
import { cx } from '@/lib/format';

interface GlassBoxProps {
    title?: ReactNode;
    description?: ReactNode;
    icon?: IconName;
    /** Clases del icono (degradado y color). */
    tone?: string;
    actions?: ReactNode;
    hover?: boolean;
    className?: string;
    bodyClassName?: string;
    style?: CSSProperties;
    children: ReactNode;
}

/** Sustituto glass de TitledGreyBox: tarjeta con cabecera opcional. */
export default function GlassBox({ title, description, icon, tone, actions, hover, className, bodyClassName, style, children }: GlassBoxProps) {
    return (
        <section className={cx('glass spotlight rounded-3xl', hover && 'glass-hover', className)} style={style}>
            {title && (
                <header className='flex items-start justify-between gap-3 px-5 pt-5'>
                    <div className='flex min-w-0 items-center gap-3'>
                        {icon && (
                            <span className={cx('icon-tile h-10 w-10', tone ?? 'from-violet-400/35 to-fuchsia-500/10 text-violet-200 ring-violet-300/30')}>
                                <Icon name={icon} className='h-[18px] w-[18px]' />
                            </span>
                        )}
                        <div className='min-w-0'>
                            <h3 className='truncate font-display text-[15px] font-semibold text-white'>{title}</h3>
                            {description && <p className='mt-0.5 text-xs text-slate-400'>{description}</p>}
                        </div>
                    </div>
                    {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}
                </header>
            )}
            <div className={cx(title ? 'p-5' : '', bodyClassName)}>{children}</div>
        </section>
    );
}
