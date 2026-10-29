/** Mismos nombres que resources/scripts/components/server/events.ts (protocolo de Wings). */
export enum SocketEvent {
    DAEMON_MESSAGE = 'daemon message',
    DAEMON_ERROR = 'daemon error',
    INSTALL_OUTPUT = 'install output',
    INSTALL_STARTED = 'install started',
    INSTALL_COMPLETED = 'install completed',
    CONSOLE_OUTPUT = 'console output',
    STATUS = 'status',
    STATS = 'stats',
    BACKUP_COMPLETED = 'backup completed',
    BACKUP_RESTORE_COMPLETED = 'backup restore completed',
}

export enum SocketRequest {
    SEND_LOGS = 'send logs',
    SEND_STATS = 'send stats',
    SET_STATE = 'set state',
    SEND_COMMAND = 'send command',
}

/** Interfaz mínima que comparten el socket simulado y el `Websocket` de Pterodactyl. */
export interface SocketLike {
    addListener(event: string, listener: (data: string) => void): void;
    removeListener(event: string, listener: (data: string) => void): void;
    send(event: string, payload?: string): void;
}
