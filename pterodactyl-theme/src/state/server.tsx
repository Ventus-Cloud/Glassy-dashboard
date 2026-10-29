/**
 * Almacén del servidor con la misma forma que el ServerContext de Pterodactyl
 * (easy-peasy): `state.server.data`, `state.status.value` y `state.socket`.
 * Así un componente se porta cambiando solo el import:
 *
 *   ServerContext.useStoreState((state) => state.server.data!.name)
 *
 * Además guarda el búfer de consola, los jugadores y el historial de
 * estadísticas. Vive por encima de las pestañas, así que la consola y las
 * gráficas siguen recibiendo datos aunque estés en otra pestaña.
 */
import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { PowerState, Server, ServerStats } from '@/api/types';
import type { SocketLike } from '@/socket/events';
import { hashHue } from '@/lib/format';

export type ConsoleLineType = 'output' | 'daemon' | 'error' | 'install' | 'command';

export interface ConsoleLine {
    id: number;
    type: ConsoleLineType;
    text: string;
}

export interface Player {
    name: string;
    joinedAt: number;
    ping: number;
}

export interface ServerStore {
    server: { data: Server | null };
    status: { value: PowerState | null };
    socket: { instance: SocketLike | null; connected: boolean };
    console: { lines: ConsoleLine[]; players: Player[] };
    stats: { current: ServerStats | null; cpu: number[]; memory: number[]; rx: number[]; tx: number[] };
}

const MAX_LINES = 600;
const HISTORY = 60;

const JOIN_RE = /^\[(\d{2}):(\d{2}):(\d{2}) INFO\]: ([A-Za-z0-9_]{3,16}) joined the game$/;
const LEAVE_RE = /^\[\d{2}:\d{2}:\d{2} INFO\]: ([A-Za-z0-9_]{3,16}) left the game$/;

function joinTime(h: string, m: string, s: string) {
    const d = new Date();
    d.setHours(Number(h), Number(m), Number(s), 0);
    if (d.getTime() > Date.now() + 60_000) d.setDate(d.getDate() - 1);
    return d.getTime();
}

/**
 * Pterodactyl no expone jugadores: aquí se deducen de los mensajes
 * «joined/left the game» de Minecraft. En producción conviene usar Query o RCON.
 */
function trackPlayers(players: Player[], lines: Omit<ConsoleLine, 'id'>[]): Player[] {
    let next = players;
    for (const line of lines) {
        if (line.type !== 'output') continue;
        const join = JOIN_RE.exec(line.text);
        if (join) {
            const name = join[4];
            next = [...next.filter((p) => p.name !== name), { name, joinedAt: joinTime(join[1], join[2], join[3]), ping: 18 + ((hashHue(name) * 7) % 110) }];
            continue;
        }
        const leave = LEAVE_RE.exec(line.text);
        if (leave) next = next.filter((p) => p.name !== leave[1]);
    }
    return next;
}

const push = (arr: number[], v: number) => [...arr.slice(-(HISTORY - 1)), v];

function createStore() {
    let state: ServerStore = {
        server: { data: null },
        status: { value: null },
        socket: { instance: null, connected: false },
        console: { lines: [], players: [] },
        stats: { current: null, cpu: [], memory: [], rx: [], tx: [] },
    };
    let lineId = 0;
    let previous: { rx: number; tx: number } | null = null;
    const listeners = new Set<() => void>();

    const set = (updater: (s: ServerStore) => ServerStore) => {
        const next = updater(state);
        if (next === state) return;
        state = next;
        listeners.forEach((l) => l());
    };

    const actions = {
        setServer: (data: Server) => set((s) => ({ ...s, server: { data } })),
        updateServer: (fn: (data: Server) => Server) => set((s) => (s.server.data ? { ...s, server: { data: fn(s.server.data) } } : s)),
        setSocket: (instance: SocketLike | null, connected: boolean) => set((s) => ({ ...s, socket: { instance, connected } })),
        setStatus: (value: PowerState) =>
            set((s) => ({
                ...s,
                status: { value },
                console: value === 'offline' || value === 'stopping' ? { ...s.console, players: [] } : s.console,
            })),
        appendLines: (lines: Omit<ConsoleLine, 'id'>[]) =>
            set((s) => ({
                ...s,
                console: {
                    lines: [...s.console.lines, ...lines.map((l) => ({ ...l, id: ++lineId }))].slice(-MAX_LINES),
                    players: trackPlayers(s.console.players, lines),
                },
            })),
        clearConsole: () => set((s) => ({ ...s, console: { ...s.console, lines: [] } })),
        pushStats: (stats: ServerStats) =>
            set((s) => {
                const rx = previous ? Math.max(0, stats.network.rx_bytes - previous.rx) : 0;
                const tx = previous ? Math.max(0, stats.network.tx_bytes - previous.tx) : 0;
                previous = { rx: stats.network.rx_bytes, tx: stats.network.tx_bytes };
                const limit = s.server.data?.limits.cpu || 100;
                return {
                    ...s,
                    // Wings manda `status` al autenticarse; aquí se toma de stats si aún no llegó.
                    status: s.status.value ? s.status : { value: stats.state },
                    stats: {
                        current: stats,
                        cpu: push(s.stats.cpu, (stats.cpu_absolute / limit) * 100),
                        memory: push(s.stats.memory, stats.memory_bytes),
                        rx: push(s.stats.rx, rx),
                        tx: push(s.stats.tx, tx),
                    },
                };
            }),
    };

    return {
        getState: () => state,
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        actions,
    };
}

type Store = ReturnType<typeof createStore>;
export type ServerActions = Store['actions'];

const StoreContext = createContext<Store | null>(null);

function ServerProvider({ children }: { children: ReactNode }) {
    const [store] = useState(createStore);
    return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function useStore(): Store {
    const store = useContext(StoreContext);
    if (!store) throw new Error('ServerContext.Provider no encontrado');
    return store;
}

/** Suscripción con selector. Solo usa hooks de React 16.8+, igual que el panel. */
function useStoreState<T>(selector: (state: ServerStore) => T): T {
    const store = useStore();
    const [, forceRender] = useReducer((c: number) => c + 1, 0);
    const selectorRef = useRef(selector);
    const valueRef = useRef<T>(selector(store.getState()));
    selectorRef.current = selector;
    valueRef.current = selector(store.getState());

    useEffect(
        () =>
            store.subscribe(() => {
                if (!Object.is(selectorRef.current(store.getState()), valueRef.current)) forceRender();
            }),
        [store],
    );

    return valueRef.current;
}

const useStoreActions = (): ServerActions => useStore().actions;

export const ServerContext = { Provider: ServerProvider, useStoreState, useStoreActions };
