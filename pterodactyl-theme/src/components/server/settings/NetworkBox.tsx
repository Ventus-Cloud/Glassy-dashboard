import { useState } from 'react';
import type { Allocation } from '@/api/types';
import { createServerAllocation, deleteServerAllocation, setPrimaryServerAllocation, setServerAllocationNotes } from '@/api/server';
import Button from '@/components/elements/Button';
import CopyButton from '@/components/elements/CopyButton';
import GlassBox from '@/components/elements/GlassBox';
import Icon from '@/components/elements/Icon';
import { ConfirmDialog } from '@/components/elements/Modal';
import Spinner from '@/components/elements/Spinner';
import { useToast } from '@/components/elements/Toast';
import { ServerContext } from '@/state/server';
import { cx } from '@/lib/format';

function AllocationRow({ allocation, onPrimary, onNotes, onDelete }: { allocation: Allocation; onPrimary: () => Promise<void>; onNotes: (notes: string) => Promise<void>; onDelete: () => void }) {
    const [notes, setNotes] = useState(allocation.notes ?? '');
    const [saving, setSaving] = useState<'notes' | 'primary' | null>(null);

    const saveNotes = async () => {
        if (notes === (allocation.notes ?? '')) return;
        setSaving('notes');
        await onNotes(notes);
        setSaving(null);
    };

    return (
        <li className={cx('grid items-center gap-3 rounded-2xl border p-3 transition md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]', allocation.isDefault ? 'border-fuchsia-300/30 bg-fuchsia-500/[0.07]' : 'border-white/10 bg-white/[0.03] hover:border-white/20')}>
            <div className='flex min-w-0 items-center gap-3'>
                <span className={cx('icon-tile h-10 w-10', allocation.isDefault ? 'from-fuchsia-400/40 to-violet-500/15 text-fuchsia-100 ring-fuchsia-300/30' : 'from-sky-400/25 to-indigo-500/10 text-sky-200 ring-sky-300/20')}>
                    <Icon name={allocation.isDefault ? 'star' : 'network'} className='h-4 w-4' />
                </span>
                <div className='min-w-0'>
                    <CopyButton text={`${allocation.alias ?? allocation.ip}:${allocation.port}`} className='max-w-full border-transparent bg-transparent px-0 py-0 text-[13px] text-white hover:bg-transparent' />
                    <p className='truncate font-mono text-[11px] text-slate-500'>{allocation.alias ? `${allocation.ip}:${allocation.port}` : `Puerto ${allocation.port}`}</p>
                </div>
            </div>
            <div className='relative'>
                <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={saveNotes}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    placeholder='Añade una nota (p. ej. «Votifier»)'
                    aria-label={`Notas del puerto ${allocation.port}`}
                    className='glass-input py-2 pr-9 text-[13px]'
                />
                {saving === 'notes' && <Spinner size='h-3.5 w-3.5' className='absolute right-3 top-1/2 -translate-y-1/2 text-violet-300' />}
            </div>
            <div className='flex items-center justify-end gap-2'>
                {allocation.isDefault ? (
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-400/15 px-2.5 py-1.5 text-xs font-medium text-fuchsia-100 ring-1 ring-fuchsia-400/30'>
                        <Icon name='star' className='h-3.5 w-3.5' />
                        Principal
                    </span>
                ) : (
                    <>
                        <Button
                            size='sm'
                            loading={saving === 'primary'}
                            onClick={async () => {
                                setSaving('primary');
                                await onPrimary();
                                setSaving(null);
                            }}
                        >
                            Hacer principal
                        </Button>
                        <Button size='sm' variant='danger' iconOnly icon='trash' onClick={onDelete} aria-label={`Eliminar el puerto ${allocation.port}`} />
                    </>
                )}
            </div>
        </li>
    );
}

/** Asignaciones de red (NetworkContainer del panel). */
export default function NetworkBox() {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const actions = ServerContext.useStoreActions();
    const toast = useToast();
    const [creating, setCreating] = useState(false);
    const [removing, setRemoving] = useState<Allocation | null>(null);
    const [busy, setBusy] = useState(false);
    const { allocations, featureLimits } = server;

    const replace = (a: Allocation) => actions.updateServer((s) => ({ ...s, allocations: s.allocations.map((x) => (x.id === a.id ? a : x)) }));
    const fail = (e: unknown) => toast({ title: 'No se pudo completar', description: (e as Error).message, tone: 'error' });

    return (
        <GlassBox
            className='lg:col-span-2'
            icon='network'
            title='Red y puertos'
            description='La asignación principal es la dirección del juego. Los puertos extra sirven para plugins (mapa web, RCON, voz…).'
            tone='from-sky-400/35 to-indigo-500/10 text-sky-200 ring-sky-300/30'
            actions={
                <Button
                    size='sm'
                    variant='primary'
                    icon='plus'
                    loading={creating}
                    disabled={allocations.length >= featureLimits.allocations}
                    onClick={async () => {
                        setCreating(true);
                        try {
                            const a = await createServerAllocation(server.uuid);
                            actions.updateServer((s) => ({ ...s, allocations: [...s.allocations, a] }));
                            toast({ title: `Puerto ${a.port} asignado`, tone: 'success', icon: 'network' });
                        } catch (e) {
                            fail(e);
                        } finally {
                            setCreating(false);
                        }
                    }}
                >
                    <span className='hidden sm:inline'>Nuevo puerto</span>
                    <span className='font-mono text-[11px] opacity-80'>
                        {allocations.length}/{featureLimits.allocations}
                    </span>
                </Button>
            }
        >
            <ul className='space-y-2.5'>
                {allocations.map((a) => (
                    <AllocationRow
                        key={a.id}
                        allocation={a}
                        onDelete={() => setRemoving(a)}
                        onNotes={async (notes) => {
                            try {
                                replace(await setServerAllocationNotes(server.uuid, a.id, notes));
                            } catch (e) {
                                fail(e);
                            }
                        }}
                        onPrimary={async () => {
                            try {
                                await setPrimaryServerAllocation(server.uuid, a.id);
                                actions.updateServer((s) => ({ ...s, allocations: s.allocations.map((x) => ({ ...x, isDefault: x.id === a.id })) }));
                                toast({ title: `Puerto principal: ${a.port}`, description: status === 'offline' ? 'Se usará en el próximo arranque.' : 'Reinicia el servidor para aplicarlo.', tone: 'success', icon: 'star' });
                            } catch (e) {
                                fail(e);
                            }
                        }}
                    />
                ))}
            </ul>
            <ConfirmDialog
                open={!!removing}
                onClose={() => setRemoving(null)}
                loading={busy}
                title={`¿Liberar el puerto ${removing?.port}?`}
                confirm='Eliminar asignación'
                icon='trash'
                onConfirm={async () => {
                    if (!removing) return;
                    setBusy(true);
                    try {
                        await deleteServerAllocation(server.uuid, removing.id);
                        actions.updateServer((s) => ({ ...s, allocations: s.allocations.filter((x) => x.id !== removing.id) }));
                        toast({ title: `Puerto ${removing.port} liberado`, tone: 'success' });
                    } catch (e) {
                        fail(e);
                    } finally {
                        setBusy(false);
                        setRemoving(null);
                    }
                }}
            >
                Los plugins que usen este puerto dejarán de ser accesibles desde fuera.
            </ConfirmDialog>
        </GlassBox>
    );
}
