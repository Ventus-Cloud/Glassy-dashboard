import { forwardRef, type ButtonHTMLAttributes } from 'react';
import Icon, { type IconName } from '@/components/elements/Icon';
import Spinner from '@/components/elements/Spinner';
import { cx } from '@/lib/format';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'warning' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: 'sm' | 'md';
    icon?: IconName;
    iconOnly?: boolean;
    loading?: boolean;
}

/** Equivalente glass de components/elements/button de Pterodactyl. */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'secondary', size = 'md', icon, iconOnly, loading, className, children, disabled, type = 'button', ...props }, ref) => (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            className={cx('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', iconOnly && 'btn-icon', className)}
            {...props}
        >
            {loading ? <Spinner size={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> : icon && <Icon name={icon} className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
            {children}
        </button>
    ),
);
Button.displayName = 'Button';

export default Button;
