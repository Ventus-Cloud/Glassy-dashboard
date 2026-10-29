import type { ServerEggVariable } from '@/api/types';
import { Input, Textarea } from '@/components/elements/Field';
import Icon from '@/components/elements/Icon';
import Switch from '@/components/elements/Switch';
import { cx } from '@/lib/format';

interface Props {
    variable: ServerEggVariable;
    value: string;
    error?: string;
    onChange: (value: string) => void;
}

const isBoolean = (v: ServerEggVariable) => v.rules.includes('boolean');
const isLong = (v: ServerEggVariable) => v.rules.some((r) => r.startsWith('max:') && Number(r.slice(4)) > 120);

/** Una variable del egg, como components/server/startup/VariableBox.tsx. */
export default function VariableBox({ variable, value, error, onChange }: Props) {
    const id = `var-${variable.envVariable}`;
    const dirty = value !== (variable.serverValue ?? variable.defaultValue);
    const required = variable.rules.includes('required');

    return (
        <div className={cx('glass glass-hover spotlight flex flex-col rounded-3xl p-5', isLong(variable) && 'md:col-span-2', dirty && 'border-fuchsia-300/30')}>
            <div className='flex items-start justify-between gap-3'>
                <label htmlFor={id} className='min-w-0'>
                    <span className='flex items-center gap-2 text-sm font-semibold text-white'>
                        {!variable.isEditable && <Icon name='lock' className='h-3.5 w-3.5 shrink-0 text-slate-400' />}
                        <span className='truncate'>{variable.name}</span>
                        {required && <span className='text-fuchsia-300'>*</span>}
                        {dirty && <span className='rounded-md bg-fuchsia-400/15 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-200 ring-1 ring-fuchsia-400/25'>modificado</span>}
                    </span>
                    <span className='mt-1 block text-xs leading-relaxed text-slate-400'>{variable.description}</span>
                </label>
                {isBoolean(variable) && <Switch id={id} checked={value === '1' || value === 'true'} disabled={!variable.isEditable} onChange={(v) => onChange(v ? '1' : '0')} label={variable.name} />}
            </div>

            {!isBoolean(variable) && (
                <div className='mt-4'>
                    {isLong(variable) ? (
                        <Textarea
                            id={id}
                            rows={3}
                            value={value}
                            disabled={!variable.isEditable}
                            aria-invalid={!!error}
                            onChange={(e) => onChange(e.target.value)}
                            className='font-mono text-[13px] leading-relaxed'
                            placeholder={variable.defaultValue}
                        />
                    ) : (
                        <Input
                            id={id}
                            value={value}
                            disabled={!variable.isEditable}
                            aria-invalid={!!error}
                            onChange={(e) => onChange(e.target.value)}
                            className='font-mono'
                            placeholder={variable.defaultValue || '—'}
                        />
                    )}
                </div>
            )}

            <div className='mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 text-[11px]'>
                {error ? (
                    <span className='text-rose-300' role='alert'>
                        {error}
                    </span>
                ) : (
                    <>
                        <span className='rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-violet-200 ring-1 ring-white/10'>{variable.envVariable}</span>
                        <span className='truncate font-mono text-slate-500' title={variable.rules.join('|')}>
                            {variable.rules.join(' | ')}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}
