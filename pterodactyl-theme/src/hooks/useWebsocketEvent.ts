import { useEffect, useRef } from 'react';
import { ServerContext } from '@/state/server';
import type { SocketEvent } from '@/socket/events';

/** Copia de plugins/useWebsocketEvent.ts del panel. */
export default function useWebsocketEvent(event: SocketEvent, callback: (data: string) => void) {
    const { connected, instance } = ServerContext.useStoreState((state) => state.socket);
    const saved = useRef(callback);

    useEffect(() => {
        saved.current = callback;
    }, [callback]);

    useEffect(() => {
        const listener = (data: string) => saved.current(data);
        if (connected && instance) instance.addListener(event, listener);
        return () => instance?.removeListener(event, listener);
    }, [event, connected, instance]);
}
