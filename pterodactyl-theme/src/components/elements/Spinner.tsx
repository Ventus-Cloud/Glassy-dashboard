import { cx } from '@/lib/format';

export default function Spinner({ size = 'h-4 w-4', className }: { size?: string; className?: string }) {
    return (
        <svg className={cx('animate-spin', size, className)} viewBox='0 0 24 24' fill='none' aria-hidden='true'>
            <circle cx='12' cy='12' r='9' stroke='currentColor' strokeOpacity='.2' strokeWidth='3' />
            <path d='M21 12a9 9 0 0 0-9-9' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
        </svg>
    );
}
