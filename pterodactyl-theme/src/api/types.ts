/**
 * Tipos alineados con resources/scripts/api/server/* de Pterodactyl 1.x.
 * Los campos extra que necesita el tema (egg, maxPlayers, sftpUsername) están
 * marcados; en el panel real salen de `server.data` o de la API de startup.
 */

export type PowerState = 'offline' | 'starting' | 'stopping' | 'running';
export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

export type ServerStatus = 'installing' | 'install_failed' | 'reinstall_failed' | 'suspended' | 'restoring_backup' | null;

export interface Allocation {
    id: number;
    ip: string;
    alias: string | null;
    port: number;
    notes: string | null;
    isDefault: boolean;
}

export interface ServerEggVariable {
    name: string;
    description: string;
    envVariable: string;
    defaultValue: string;
    serverValue: string | null;
    isEditable: boolean;
    rules: string[];
}

export interface Server {
    identifier: string;
    uuid: string;
    name: string;
    description: string;
    node: string;
    status: ServerStatus;
    sftpDetails: { ip: string; port: number };
    invocation: string;
    dockerImage: string;
    limits: { memory: number; swap: number; disk: number; io: number; cpu: number; threads: string | null };
    featureLimits: { databases: number; allocations: number; backups: number };
    allocations: Allocation[];
    variables: ServerEggVariable[];
    /** Extra del tema: nombre del egg y nido para la cabecera. */
    egg: { name: string; nest: string; game: string };
    /** Extra del tema: plazas máximas (en Minecraft sale de server.properties). */
    maxPlayers: number;
    /** Extra del tema: en Pterodactyl es `${user.username}.${server.id}`. */
    sftpUsername: string;
}

export interface FileObject {
    key: string;
    name: string;
    mode: string;
    modeBits: string;
    size: number;
    isFile: boolean;
    isSymlink: boolean;
    mimetype: string;
    createdAt: Date;
    modifiedAt: Date;
    isArchiveType: () => boolean;
    isEditable: () => boolean;
}

export interface ServerBackup {
    uuid: string;
    isSuccessful: boolean;
    isLocked: boolean;
    name: string;
    ignoredFiles: string;
    checksum: string;
    bytes: number;
    createdAt: Date;
    completedAt: Date | null;
}

export interface StartupData {
    invocation: string;
    rawInvocation: string;
    variables: ServerEggVariable[];
    dockerImages: Record<string, string>;
}

/** Carga útil del evento `stats` de Wings (JSON). */
export interface ServerStats {
    memory_bytes: number;
    memory_limit_bytes: number;
    cpu_absolute: number;
    disk_bytes: number;
    network: { rx_bytes: number; tx_bytes: number };
    state: PowerState;
    uptime: number;
}
