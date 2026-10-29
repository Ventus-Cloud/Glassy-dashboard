import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cx } from '@/lib/format';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input ref={ref} className={cx('glass-input', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
    <textarea ref={ref} className={cx('glass-input resize-y', className)} {...props} />
));
Textarea.displayName = 'Textarea';

interface FieldProps {
    id: string;
    label: ReactNode;
    hint?: ReactNode;
    error?: string | null;
    children: ReactNode;
    className?: string;
}

export function Field({ id, label, hint, error, children, className }: FieldProps) {
    return (
        <div className={className}>
            <label htmlFor={id} className='field-label'>
                {label}
            </label>
            {children}
            {error ? (
                <p className='mt-1.5 text-xs text-rose-300' role='alert'>
                    {error}
                </p>
            ) : (
                hint && <p className='mt-1.5 text-xs text-slate-500'>{hint}</p>
            )}
        </div>
    );
}
