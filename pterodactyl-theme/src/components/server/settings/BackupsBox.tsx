import { useCallback, useEffect, useState } from 'react';
import type { ServerBackup } from '@/api/types';
import { createServerBackup, deleteBackup, getServerBackups, restoreServerBackup, setBackupLock } from '@/api/server';
import Button from '@/components/elements/Button';
import { Field, Input, Textarea } from '@/components/elements/Field';
import FloatingMenu, { type MenuAnchor } from '@/components/elements/FloatingMenu';
import GlassBox from '@/components/elements/GlassBox';
import Icon from '@/components/elements/Icon';
import Modal, { ConfirmDialog } from '@/components/elements/Modal';
import Switch from '@/components/elements/Switch';
import { useToast } from '@/components/elements/Toast';
import useWebsocketEvent from '@/hooks/useWebsocketEvent';
import { SocketEvent } from '@/socket/events';
import { ServerContext } from '@/state/server';
import { bytesToString, cx, formatDate, relativeTime } from '@/lib/format';

/** Copias de seguridad (BackupContainer del panel), compactado en una tarjeta. */
export default function BackupsBox() {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const actions = ServerContext.useStoreActions();
    const toast = useToast();
    const [backups, setBackups] = useState<ServerBackup[] | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', ignored: 'logs/\ncache/', isLocked: false });
    const [saving, setSaving] = useState(false);
    const [menu, setMenu] = useState<{ backup: ServerBackup; anchor: MenuAnchor } | null>(null);
    const [confirm, setConfirm] = useState<{ kind: 'delete' | 'restore'; backup: ServerBackup } | null>(null);
    const [busy, setBusy] = useState(false);

    const reload = useCallback(() => getServerBackups(server.uuid).then(setBackups), [server.uuid]);
    useEffect(() => {
        reload();
    }, [reload]);

    // Wings avisa por websocket cuando termina una copia.
    useWebsocketEvent(SocketEvent.BACKUP_COMPLETED, (data) => {
        const { uuid, file_size } = JSON.parse(data) as { uuid: string; file_size: number };
        const done = backups?.find((b) => b.uuid === uuid);
        toast({ title: 'Copia de seguridad completada', description: `${done?.name ?? 'Copia'} · ${bytesToString(file_size)}`, tone: 'success', icon: 'archive' });
        reload();
    });

    const fail = (e: unknown) => toast({ title: 'No se pudo completar', description: (e as Error).message, tone: 'error' });
    const limit = server.featureLimits.backups;
    const count = backups?.length ?? 0;

    return (
        <GlassBox
            className='lg:col-span-2'
            icon='archive'
            title='Copias de seguridad'
            description='Las copias bloqueadas no se borran al rotar ni por accidente.'
            tone='from-emerald-400/35 to-teal-500/10 text-emerald-200 ring-emerald-300/30'
            actions={
                <Button size='sm' variant='primary' icon='plus' disabled={count >= limit} onClick={() => setCreating(true)}>
                    <span className='hidden sm:inline'>Crear copia</span>
                    <span className='font-mono text-[11px] opacity-80'>
                        {count}/{limit}
                    </span>
                </Button>
            }
        >
            {backups === null ? (
                <div className='space-y-2.5'>
                    {[0, 1].map((i) => (
                        <div key={i} className='h-16 animate-pulse rounded-2xl bg-white/[0.04]' />
                    ))}
                </div>
            ) : backups.length === 0 ? (
                <p className='py-8 text-center text-sm text-slate-400'>Todavía no hay copias. Crea la primera antes de hacer cambios grandes.</p>
            ) : (
                <ul className='space-y-2.5'>
                    {backups.map((b) => {
                        const pending = !b.completedAt;
                        return (
                            <li key={b.uuid} className='relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20'>
                                <span className={cx('icon-tile h-10 w-10', pending ? 'from-sky-400/30 to-indigo-500/10 text-sky-200 ring-sky-300/25' : 'from-emerald-400/30 to-teal-500/10 text-emerald-200 ring-emerald-300/25')}>
                                    <Icon name={pending ? 'refresh' : b.isLocked ? 'lock' : 'archive'} className={cx('h-4 w-4', pending && 'animate-spin [animation-duration:2s]')} />
                                </span>
                                <div className='min-w-0 flex-1'>
                                    <p className='flex items-center gap-2 truncate text-sm font-medium text-white'>
                                        <span className='truncate'>{b.name}</span>
                                        {b.isLocked && <span className='shrink-0 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-200 ring-1 ring-amber-400/25'>bloqueada</span>}
                                    </p>
                                    <p className='truncate font-mono text-[11px] text-slate-500' title={formatDate(b.createdAt)}>
                                        {pending ? 'Generando copia…' : `${bytesToString(b.bytes)} · ${relativeTime(b.createdAt)} · ${b.checksum.slice(0, 18)}…`}
                                    </p>
                                </div>
                                <button
                                    disabled={pending}
                                    onClick={(e) => setMenu({ backup: b, anchor: e.currentTarget.getBoundingClientRect() })}
                                    className='grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30'
                                    aria-label={`Acciones de ${b.name}`}
                                >
                                    <Icon name='more' className='h-4 w-4' strokeWidth={2.4} />
                                </button>
                                {pending && (
                                    <span className='absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-white/5'>
                                        <span className='meter-fill block h-full w-full' />
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <FloatingMenu
                anchor={menu?.anchor ?? null}
                onClose={() => setMenu(null)}
                items={
                    menu
                        ? [
                              { label: 'Descargar', icon: 'download', onSelect: () => toast({ title: `Descargando ${menu.backup.name}`, description: 'El panel genera un enlace temporal firmado.', tone: 'info', icon: 'download' }) },
                              { label: 'Restaurar', icon: 'refresh', onSelect: () => setConfirm({ kind: 'restore', backup: menu.backup }) },
                              {
                                  label: menu.backup.isLocked ? 'Desbloquear' : 'Bloquear',
                                  icon: menu.backup.isLocked ? 'unlock' : 'lock',
                                  onSelect: () =>
                                      setBackupLock(server.uuid, menu.backup.uuid)
                                          .then((b) => toast({ title: b.isLocked ? 'Copia bloqueada' : 'Copia desbloqueada', tone: 'success', icon: b.isLocked ? 'lock' : 'unlock' }))
                                          .catch(fail)
                                          .finally(reload),
                              },
                              'divider',
                              { label: 'Eliminar', icon: 'trash', danger: true, disabled: menu.backup.isLocked, onSelect: () => setConfirm({ kind: 'delete', backup: menu.backup }) },
                          ]
                        : []
                }
            />

            <Modal
                open={creating}
                onClose={() => setCreating(false)}
                locked={saving}
                icon='archive'
                tone='from-emerald-400/35 to-teal-500/10 text-emerald-200 ring-emerald-300/30'
                title='Nueva copia de seguridad'
                description='Wings comprime los archivos del servidor sin detenerlo.'
                size='md'
                footer={
                    <>
                        <Button variant='ghost' onClick={() => setCreating(false)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button
                            variant='primary'
                            icon='archive'
                            loading={saving}
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    await createServerBackup(server.uuid, form);
                                    toast({ title: 'Copia en marcha', description: 'Te avisaremos cuando termine.', tone: 'info', icon: 'archive' });
                                    setCreating(false);
                                    setForm({ name: '', ignored: 'logs/\ncache/', isLocked: false });
                                    reload();
                                } catch (e) {
                                    fail(e);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            Crear copia
                        </Button>
                    </>
                }
            >
                <div className='space-y-4'>
                    <Field id='backup-name' label='Nombre' hint='Si lo dejas vacío se usa la fecha y la hora.'>
                        <Input id='backup-name' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder='Antes de instalar plugins' />
                    </Field>
                    <Field id='backup-ignored' label='Archivos ignorados' hint='Una ruta por línea, con la misma sintaxis que .gitignore.'>
                        <Textarea id='backup-ignored' rows={4} value={form.ignored} onChange={(e) => setForm({ ...form, ignored: e.target.value })} className='font-mono text-[13px]' />
                    </Field>
                    <div className='flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3'>
                        <div>
                            <p className='text-sm font-medium text-white'>Bloquear copia</p>
                            <p className='text-xs text-slate-400'>Impide borrarla hasta que la desbloquees.</p>
                        </div>
                        <Switch checked={form.isLocked} onChange={(isLocked) => setForm({ ...form, isLocked })} label='Bloquear copia' />
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                open={!!confirm}
                onClose={() => setConfirm(null)}
                loading={busy}
                variant={confirm?.kind === 'restore' ? 'warning' : 'danger'}
                icon={confirm?.kind === 'restore' ? 'refresh' : 'trash'}
                title={confirm?.kind === 'restore' ? `¿Restaurar «${confirm.backup.name}»?` : `¿Eliminar «${confirm?.backup.name}»?`}
                confirm={confirm?.kind === 'restore' ? 'Restaurar' : 'Eliminar'}
                onConfirm={async () => {
                    if (!confirm) return;
                    setBusy(true);
                    try {
                        if (confirm.kind === 'delete') {
                            await deleteBackup(server.uuid, confirm.backup.uuid);
                            toast({ title: 'Copia eliminada', tone: 'success' });
                        } else {
                            await restoreServerBackup(server.uuid, confirm.backup.uuid, false);
                            actions.updateServer((s) => ({ ...s, status: 'restoring_backup' }));
                            toast({ title: 'Restaurando copia…', description: 'El servidor quedará bloqueado hasta que termine.', tone: 'warning', icon: 'refresh' });
                        }
                    } catch (e) {
                        fail(e);
                    } finally {
                        setBusy(false);
                        setConfirm(null);
                        reload();
                    }
                }}
            >
                {confirm?.kind === 'restore'
                    ? 'Los archivos actuales se sustituirán por los de la copia. Detén el servidor antes para evitar que el mundo se corrompa.'
                    : 'La copia se borrará del almacenamiento del nodo y no se podrá recuperar.'}
            </ConfirmDialog>
        </GlassBox>
    );
}
