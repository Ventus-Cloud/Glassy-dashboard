import { cx } from '@/lib/format';

interface SwitchProps {
    id?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
}

export default function Switch({ id, checked, onChange, disabled, label }: SwitchProps) {
    return (
        <button
            id={id}
            type='button'
            role='switch'
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cx(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50',
                checked ? 'border-fuchsia-300/40 bg-linear-to-r from-violet-500 to-fuchsia-500 shadow-[0_0_16px_-2px_rgba(217,70,239,.7)]' : 'border-white/15 bg-white/10',
            )}
        >
            <span className={cx('inline-block h-4.5 w-4.5 rounded-full bg-white shadow transition-transform duration-300', checked ? 'translate-x-[22px]' : 'translate-x-[3px]')} />
        </button>
    );
}
