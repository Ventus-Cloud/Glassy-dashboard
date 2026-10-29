import { useState } from 'react';
import { reinstallServer } from '@/api/server';
import Button from '@/components/elements/Button';
import { ConfirmDialog } from '@/components/elements/Modal';
import Icon from '@/components/elements/Icon';
import { useToast } from '@/components/elements/Toast';
import { ServerContext } from '@/state/server';

/** Zona de peligro: reinstalar (ReinstallServerBox del panel). */
export default function ReinstallServerBox({ onReinstalled }: { onReinstalled: () => void }) {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const installing = server.status === 'installing';

    return (
        <section className='relative overflow-hidden rounded-3xl border border-rose-400/25 bg-rose-500/[0.07] p-5 backdrop-blur-xl lg:col-span-2'>
            <div className='pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(244,63,94,.25),transparent)]' aria-hidden='true' />
            <div className='relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex items-start gap-3'>
                    <span className='icon-tile h-10 w-10 from-rose-400/40 to-rose-600/10 text-rose-100 ring-rose-300/30'>
                        <Icon name='wrench' className='h-[18px] w-[18px]' />
                    </span>
                    <div>
                        <h3 className='font-display text-[15px] font-semibold text-white'>Reinstalar el servidor</h3>
                        <p className='mt-1 max-w-2xl text-sm text-rose-100/70'>
                            Detiene el servidor y vuelve a ejecutar el script de instalación del egg. Algunos archivos pueden sobrescribirse; haz una copia de seguridad antes.
                        </p>
                    </div>
                </div>
                <Button variant='danger' icon='wrench' loading={installing} onClick={() => setOpen(true)} className='shrink-0'>
                    {installing ? 'Instalando…' : 'Reinstalar'}
                </Button>
            </div>
            <ConfirmDialog
                open={open}
                onClose={() => setOpen(false)}
                loading={busy}
                title='¿Reinstalar el servidor?'
                confirm='Sí, reinstalar'
                icon='wrench'
                onConfirm={async () => {
                    setBusy(true);
                    try {
                        await reinstallServer(server.uuid);
                        toast({ title: 'Reinstalación iniciada', description: 'Puedes seguir el progreso en la consola.', tone: 'warning', icon: 'wrench' });
                        onReinstalled();
                    } catch (e) {
                        toast({ title: 'No se pudo reinstalar', description: (e as Error).message, tone: 'error' });
                    } finally {
                        setBusy(false);
                        setOpen(false);
                    }
                }}
            >
                El servidor se detendrá y se ejecutará de nuevo el instalador de <strong className='text-white'>{server.egg.name}</strong>. Esta acción no se puede deshacer.
            </ConfirmDialog>
        </section>
    );
}
