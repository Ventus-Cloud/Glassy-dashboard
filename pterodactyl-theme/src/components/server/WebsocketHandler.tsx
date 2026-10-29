import { useEffect } from 'react';
import type { PowerState } from '@/api/types';
import { getServer } from '@/api/server';
import { getMockSocket } from '@/socket/MockSocket';
import { SocketEvent, SocketRequest } from '@/socket/events';
import { ServerContext, type ConsoleLine } from '@/state/server';

/**
 * Como components/server/WebsocketHandler.tsx: conecta el socket una sola vez
 * por servidor y vuelca los eventos en el almacén. Al integrar el tema, cambia
 * getMockSocket() por la instancia de `Websocket` que crea el panel.
 */
export default function WebsocketHandler({ uuid }: { uuid: string }) {
    const actions = ServerContext.useStoreActions();

    useEffect(() => {
        let alive = true;
        getServer(uuid).then((data) => alive && actions.setServer(data));

        const socket = getMockSocket();
        let queue: Omit<ConsoleLine, 'id'>[] = [];
        let timer = 0;
        // Agrupa ráfagas de líneas (arranques, «send logs») en un único render.
        const enqueue = (type: ConsoleLine['type']) => (text: string) => {
            queue.push({ type, text });
            if (!timer) {
                timer = window.setTimeout(() => {
                    actions.appendLines(queue);
                    queue = [];
                    timer = 0;
                }, 32);
            }
        };

        const output = enqueue('output');
        const daemon = enqueue('daemon');
        const handlers: Partial<Record<SocketEvent, (data: string) => void>> = {
            [SocketEvent.CONSOLE_OUTPUT]: output,
            [SocketEvent.DAEMON_MESSAGE]: daemon,
            [SocketEvent.DAEMON_ERROR]: enqueue('error'),
            [SocketEvent.INSTALL_OUTPUT]: enqueue('install'),
            [SocketEvent.STATUS]: (state) => {
                actions.setStatus(state as PowerState);
                daemon(`Server marked as ${state}...`);
            },
            [SocketEvent.STATS]: (data) => actions.pushStats(JSON.parse(data)),
            [SocketEvent.INSTALL_STARTED]: () => {
                actions.updateServer((s) => ({ ...s, status: 'installing' }));
                daemon('Installation process started.');
            },
            [SocketEvent.INSTALL_COMPLETED]: () => {
                actions.updateServer((s) => ({ ...s, status: null }));
                daemon('Installation process completed.');
            },
            [SocketEvent.BACKUP_RESTORE_COMPLETED]: () => {
                actions.updateServer((s) => ({ ...s, status: null }));
                daemon('Backup restoration completed.');
            },
        };

        Object.entries(handlers).forEach(([event, fn]) => socket.addListener(event, fn!));
        actions.setSocket(socket, true);
        actions.clearConsole();
        socket.send(SocketRequest.SEND_LOGS);
        socket.send(SocketRequest.SEND_STATS);

        return () => {
            alive = false;
            window.clearTimeout(timer);
            Object.entries(handlers).forEach(([event, fn]) => socket.removeListener(event, fn!));
            actions.setSocket(null, false);
        };
    }, [uuid, actions]);

    return null;
}
