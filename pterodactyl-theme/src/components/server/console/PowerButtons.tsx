import { useEffect, useState } from 'react';
import Button from '@/components/elements/Button';
import { ConfirmDialog } from '@/components/elements/Modal';
import { useToast } from '@/components/elements/Toast';
import type { PowerAction } from '@/api/types';
import { SocketRequest } from '@/socket/events';
import { ServerContext } from '@/state/server';
import { cx } from '@/lib/format';

/** Misma lógica que components/server/console/PowerButtons.tsx, con estilo glass. */
export default function PowerButtons({ className }: { className?: string }) {
    const [open, setOpen] = useState(false);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const installing = ServerContext.useStoreState((state) => state.server.data?.status === 'installing');
    const instance = ServerContext.useStoreState((state) => state.socket.instance);
    const toast = useToast();
    const killable = status === 'stopping';

    useEffect(() => {
        if (status === 'offline') setOpen(false);
    }, [status]);

    const send = (action: PowerAction) => {
        setOpen(false);
        instance?.send(SocketRequest.SET_STATE, action);
        const labels: Record<PowerAction, string> = { start: 'Iniciando el servidor…', restart: 'Reiniciando el servidor…', stop: 'Deteniendo el servidor…', kill: 'Proceso terminado (kill)' };
        toast({ title: labels[action], tone: action === 'start' ? 'success' : action === 'restart' ? 'warning' : 'error', icon: action === 'start' ? 'play' : action === 'restart' ? 'rotate' : 'power' });
    };

    return (
        <div className={cx('grid grid-cols-3 gap-2 sm:flex', className)}>
            <ConfirmDialog
                open={open}
                onClose={() => setOpen(false)}
                onConfirm={() => send('kill')}
                title='Forzar la parada del proceso'
                confirm='Forzar parada'
                icon='zap'
            >
                Forzar la parada mata el proceso sin guardar el mundo y puede corromper datos. Úsalo solo si el servidor no responde.
            </ConfirmDialog>
            <Button size='sm' variant='success' icon='play' disabled={installing || status !== 'offline'} onClick={() => send('start')}>
                Iniciar
            </Button>
            <Button size='sm' variant='warning' icon='rotate' disabled={installing || !status} onClick={() => send('restart')}>
                Reiniciar
            </Button>
            <Button size='sm' variant='danger' icon={killable ? 'zap' : 'power'} disabled={installing || !status || status === 'offline'} onClick={() => (killable ? setOpen(true) : send('stop'))}>
                {killable ? 'Forzar' : 'Apagar'}
            </Button>
        </div>
    );
}
