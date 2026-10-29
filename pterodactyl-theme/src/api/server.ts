/**
 * API del servidor para la vista previa.
 *
 * Cada función tiene el mismo nombre y la misma firma que su equivalente en
 * resources/scripts/api/server/** de Pterodactyl, y el comentario indica el
 * endpoint real. Al integrar el tema, importa las de Pterodactyl en su lugar.
 */
import type { Allocation, FileObject, Server, ServerBackup, ServerEggVariable, StartupData } from '@/api/types';
import {
    backups,
    dir,
    DOCKER_IMAGES,
    file,
    fsRoot,
    resolveInvocation,
    server,
    STARTUP_TEMPLATE,
    touch,
    type FsNode,
} from '@/api/mock/db';
import { getMockSocket } from '@/socket/MockSocket';
import { SocketEvent } from '@/socket/events';
import { pad, rand, randi } from '@/lib/format';

const latency = (min = 160, max = 420) => new Promise<void>((r) => window.setTimeout(r, rand(min, max)));
const clone = <T,>(v: T): T => structuredClone(v);

/* --------------------------------------------------------------- utilidades */
const ARCHIVE_RE = /\.(zip|tar|tar\.gz|tgz|gz|rar|7z)$/i;
const BINARY_RE = /\.(jar|dat|mca|db|lock|png|jpg|jpeg|gif|webp|ogg|so|dll)$/i;

function mimetypeFor(name: string, isFile: boolean): string {
    if (!isFile) return 'inode/directory';
    if (/\.zip$/i.test(name)) return 'application/zip';
    if (/\.(tar\.gz|tgz|gz)$/i.test(name)) return 'application/gzip';
    if (/\.jar$/i.test(name)) return 'application/java-archive';
    if (/\.json$/i.test(name)) return 'application/json';
    if (/\.ya?ml$/i.test(name)) return 'application/yaml';
    if (BINARY_RE.test(name)) return 'application/octet-stream';
    return 'text/plain';
}

function toFileObject(node: FsNode): FileObject {
    const mimetype = mimetypeFor(node.name, node.isFile);
    return {
        key: `${node.isFile ? 'file' : 'dir'}_${node.name}`,
        name: node.name,
        mode: node.mode,
        modeBits: node.isFile ? '644' : '755',
        size: node.size,
        isFile: node.isFile,
        isSymlink: false,
        mimetype,
        createdAt: node.createdAt,
        modifiedAt: node.modifiedAt,
        isArchiveType: () => node.isFile && ARCHIVE_RE.test(node.name),
        isEditable: () => node.isFile && !ARCHIVE_RE.test(node.name) && !BINARY_RE.test(node.name) && node.size < 4 * 1024 * 1024,
    };
}

const segments = (path: string) => path.split('/').filter(Boolean);

function findNode(path: string): FsNode {
    let node = fsRoot;
    for (const part of segments(path)) {
        const next = node.children?.find((c) => c.name === part);
        if (!next) throw new Error(`No existe: /${segments(path).join('/')}`);
        node = next;
    }
    return node;
}

function findDir(path: string): FsNode {
    const node = findNode(path);
    if (node.isFile) throw new Error('La ruta no es un directorio');
    node.children ??= [];
    return node;
}

function splitPath(path: string): [string, string] {
    const parts = segments(path);
    return ['/' + parts.slice(0, -1).join('/'), parts[parts.length - 1] ?? ''];
}

function assertFreeName(parent: FsNode, name: string) {
    if (!name || /[/\\]/.test(name)) throw new Error('El nombre no es válido');
    if (parent.children?.some((c) => c.name === name)) throw new Error(`Ya existe «${name}» en esta carpeta`);
}

const deepCopy = (node: FsNode, name = node.name): FsNode => ({
    ...node,
    name,
    createdAt: new Date(),
    modifiedAt: new Date(),
    children: node.children?.map((c) => deepCopy(c)),
});

const sizeOf = (node: FsNode): number => (node.isFile ? node.size : (node.children ?? []).reduce((a, c) => a + sizeOf(c), 0));

/* ------------------------------------------------------------------ servidor */
/** GET /api/client/servers/{uuid} */
export async function getServer(_uuid: string): Promise<Server> {
    await latency(80, 160);
    return clone(server);
}

/** POST /api/client/servers/{uuid}/settings/rename */
export async function renameServer(_uuid: string, name: string, description?: string): Promise<void> {
    await latency();
    if (!name.trim()) throw new Error('El nombre es obligatorio');
    if (name.length > 191) throw new Error('El nombre no puede superar los 191 caracteres');
    server.name = name.trim();
    if (description !== undefined) server.description = description.trim();
}

/** POST /api/client/servers/{uuid}/settings/reinstall */
export async function reinstallServer(_uuid: string): Promise<void> {
    await latency();
    server.status = 'installing';
    getMockSocket().reinstall(() => {
        server.status = null;
    });
}

/* ------------------------------------------------------------------ archivos */
/** GET /api/client/servers/{uuid}/files/list?directory= */
export async function loadDirectory(_uuid: string, directory = '/'): Promise<FileObject[]> {
    await latency(120, 280);
    return (findDir(directory).children ?? []).map(toFileObject);
}

/** GET /api/client/servers/{uuid}/files/contents?file= */
export async function getFileContents(_uuid: string, path: string): Promise<string> {
    await latency(120, 260);
    const node = findNode(path);
    if (!node.isFile) throw new Error('No es un archivo');
    return node.content ?? `# ${node.name}\n# Contenido no disponible en la vista previa (${node.size} bytes).\n`;
}

/** POST /api/client/servers/{uuid}/files/write?file= */
export async function saveFileContents(_uuid: string, path: string, content: string): Promise<void> {
    await latency();
    const [parent, name] = splitPath(path);
    const folder = findDir(parent);
    const existing = folder.children!.find((c) => c.name === name);
    if (existing) touch(existing, content);
    else folder.children!.push(file(name, content, 0));
}

/** POST /api/client/servers/{uuid}/files/create-folder */
export async function createDirectory(_uuid: string, root: string, name: string): Promise<void> {
    await latency();
    const folder = findDir(root);
    assertFreeName(folder, name);
    folder.children!.push(dir(name, [], 0));
    touch(folder);
}

/** PUT /api/client/servers/{uuid}/files/rename */
export async function renameFiles(_uuid: string, directory: string, files: { from: string; to: string }[]): Promise<void> {
    await latency();
    const folder = findDir(directory);
    for (const { from, to } of files) {
        const node = folder.children!.find((c) => c.name === from);
        if (!node) throw new Error(`No existe «${from}»`);
        if (from === to) continue;
        assertFreeName(folder, to);
        node.name = to;
        touch(node);
    }
}

/** POST /api/client/servers/{uuid}/files/copy */
export async function copyFile(_uuid: string, location: string): Promise<void> {
    await latency();
    const [parent, name] = splitPath(location);
    const folder = findDir(parent);
    const node = folder.children!.find((c) => c.name === name);
    if (!node) throw new Error(`No existe «${name}»`);
    const dot = node.isFile ? name.lastIndexOf('.') : -1;
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let candidate = `${base} copy${ext}`;
    for (let i = 2; folder.children!.some((c) => c.name === candidate); i++) candidate = `${base} copy ${i}${ext}`;
    folder.children!.push(deepCopy(node, candidate));
}

/** POST /api/client/servers/{uuid}/files/delete */
export async function deleteFiles(_uuid: string, directory: string, files: string[]): Promise<void> {
    await latency();
    const folder = findDir(directory);
    folder.children = folder.children!.filter((c) => !files.includes(c.name));
    touch(folder);
}

/** POST /api/client/servers/{uuid}/files/compress */
export async function compressFiles(_uuid: string, directory: string, files: string[]): Promise<FileObject> {
    await latency(600, 1100);
    const folder = findDir(directory);
    const total = folder.children!.filter((c) => files.includes(c.name)).reduce((a, c) => a + sizeOf(c), 0);
    const d = new Date();
    const name = `archive-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.zip`;
    const node = file(name, Math.max(1024, Math.round(total * rand(0.38, 0.55))), 0);
    folder.children!.push(node);
    return toFileObject(node);
}

/** POST /api/client/servers/{uuid}/files/decompress */
export async function decompressFiles(_uuid: string, directory: string, archive: string): Promise<void> {
    await latency(700, 1200);
    const folder = findDir(directory);
    let target = archive.replace(ARCHIVE_RE, '') || 'extraido';
    for (let i = 2; folder.children!.some((c) => c.name === target); i++) target = `${archive.replace(ARCHIVE_RE, '')}-${i}`;
    folder.children!.push(dir(target, [file('LEEME.txt', `Contenido extraído de ${archive}.\n`, 0), dir('world', [], 0)], 0));
}

/**
 * Pterodactyl pide una URL firmada (getFileUploadUrl) y sube con axios
 * directamente a Wings. Aquí se simula el progreso.
 */
export async function uploadFile(_uuid: string, directory: string, upload: File, onProgress: (pct: number) => void): Promise<void> {
    const steps = Math.max(6, Math.min(30, Math.round(upload.size / 400_000)));
    for (let i = 1; i <= steps; i++) {
        await new Promise((r) => window.setTimeout(r, rand(60, 140)));
        onProgress(Math.round((i / steps) * 100));
    }
    const folder = findDir(directory);
    const text = upload.size < 512_000 && /^text\/|json|yaml|xml|properties/.test(upload.type || 'text/plain') ? await upload.text() : undefined;
    const existing = folder.children!.find((c) => c.name === upload.name);
    const node = text !== undefined ? file(upload.name, text, 0) : file(upload.name, upload.size, 0);
    if (existing) Object.assign(existing, { ...node, name: existing.name });
    else folder.children!.push(node);
}

/* ------------------------------------------------------------------- startup */
/** GET /api/client/servers/{uuid}/startup */
export async function getServerStartup(_uuid: string): Promise<StartupData> {
    await latency(120, 240);
    return { invocation: resolveInvocation(), rawInvocation: STARTUP_TEMPLATE, variables: clone(server.variables), dockerImages: { ...DOCKER_IMAGES } };
}

function validate(variable: ServerEggVariable, value: string) {
    for (const rule of variable.rules) {
        const [name, arg] = [rule.split(':')[0], rule.slice(rule.indexOf(':') + 1)];
        if (name === 'required' && !value.trim()) throw new Error(`«${variable.name}» es obligatorio.`);
        if (name === 'max' && value.length > Number(arg)) throw new Error(`«${variable.name}» no puede superar ${arg} caracteres.`);
        if (name === 'boolean' && !['0', '1', 'true', 'false'].includes(value)) throw new Error(`«${variable.name}» debe ser verdadero o falso.`);
        if (name === 'regex' && value) {
            const m = /^\/(.*)\/([a-z]*)$/.exec(arg);
            if (m && !new RegExp(m[1], m[2]).test(value)) throw new Error(`«${variable.name}» no tiene un formato válido.`);
        }
    }
}

/** PUT /api/client/servers/{uuid}/startup/variable — devuelve [variable, startup_command] */
export async function updateStartupVariable(_uuid: string, key: string, value: string): Promise<[ServerEggVariable, string]> {
    await latency(200, 450);
    const variable = server.variables.find((v) => v.envVariable === key);
    if (!variable) throw new Error(`Variable desconocida: ${key}`);
    if (!variable.isEditable) throw new Error(`«${variable.name}» no se puede editar.`);
    validate(variable, value);
    variable.serverValue = value;
    server.invocation = resolveInvocation();
    return [clone(variable), server.invocation];
}

/** PUT /api/client/servers/{uuid}/settings/docker-image */
export async function setSelectedDockerImage(_uuid: string, image: string): Promise<void> {
    await latency();
    if (!Object.values(DOCKER_IMAGES).includes(image)) throw new Error('Esa imagen no está permitida por el egg.');
    server.dockerImage = image;
}

/* ----------------------------------------------------------------------- red */
/** POST /api/client/servers/{uuid}/network/allocations */
export async function createServerAllocation(_uuid: string): Promise<Allocation> {
    await latency();
    if (server.allocations.length >= server.featureLimits.allocations) throw new Error('Has alcanzado el límite de asignaciones.');
    const used = new Set(server.allocations.map((a) => a.port));
    let port = randi(25567, 25600);
    while (used.has(port)) port = randi(25567, 25600);
    const allocation: Allocation = { id: Math.max(...server.allocations.map((a) => a.id)) + 1, ip: server.allocations[0].ip, alias: null, port, notes: null, isDefault: false };
    server.allocations.push(allocation);
    return clone(allocation);
}

/** POST /api/client/servers/{uuid}/network/allocations/{id}/primary */
export async function setPrimaryServerAllocation(_uuid: string, id: number): Promise<Allocation> {
    await latency();
    server.allocations.forEach((a) => (a.isDefault = a.id === id));
    server.invocation = resolveInvocation();
    return clone(server.allocations.find((a) => a.id === id)!);
}

/** POST /api/client/servers/{uuid}/network/allocations/{id} */
export async function setServerAllocationNotes(_uuid: string, id: number, notes: string | null): Promise<Allocation> {
    await latency(150, 300);
    const allocation = server.allocations.find((a) => a.id === id);
    if (!allocation) throw new Error('La asignación no existe');
    allocation.notes = notes?.trim() || null;
    return clone(allocation);
}

/** DELETE /api/client/servers/{uuid}/network/allocations/{id} */
export async function deleteServerAllocation(_uuid: string, id: number): Promise<void> {
    await latency();
    const allocation = server.allocations.find((a) => a.id === id);
    if (allocation?.isDefault) throw new Error('No puedes eliminar la asignación principal.');
    server.allocations = server.allocations.filter((a) => a.id !== id);
}

/* ------------------------------------------------------------------- backups */
/** GET /api/client/servers/{uuid}/backups */
export async function getServerBackups(_uuid: string): Promise<ServerBackup[]> {
    await latency(120, 240);
    return clone(backups);
}

/** POST /api/client/servers/{uuid}/backups — termina con el evento `backup completed` */
export async function createServerBackup(_uuid: string, params: { name?: string; ignored?: string; isLocked: boolean }): Promise<ServerBackup> {
    await latency();
    if (backups.length >= server.featureLimits.backups) throw new Error('Has alcanzado el límite de copias de seguridad.');
    const d = new Date();
    const backup: ServerBackup = {
        uuid: crypto.randomUUID(),
        isSuccessful: false,
        isLocked: params.isLocked,
        name: params.name?.trim() || `Copia del ${d.toLocaleDateString('es-ES')} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
        ignoredFiles: params.ignored ?? '',
        checksum: '',
        bytes: 0,
        createdAt: d,
        completedAt: null,
    };
    backups.unshift(backup);
    window.setTimeout(() => {
        backup.isSuccessful = true;
        backup.completedAt = new Date();
        backup.bytes = Math.round(sizeOf(fsRoot) * rand(0.42, 0.5));
        backup.checksum = `sha1:${Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, '0')).join('')}`;
        getMockSocket().emitEvent(
            SocketEvent.BACKUP_COMPLETED,
            JSON.stringify({ uuid: backup.uuid, is_successful: true, checksum: backup.checksum, checksum_type: 'sha1', file_size: backup.bytes }),
        );
    }, rand(3500, 5500));
    return clone(backup);
}

/** POST /api/client/servers/{uuid}/backups/{backup}/lock */
export async function setBackupLock(_uuid: string, backupUuid: string): Promise<ServerBackup> {
    await latency(150, 300);
    const backup = backups.find((b) => b.uuid === backupUuid);
    if (!backup) throw new Error('La copia no existe');
    backup.isLocked = !backup.isLocked;
    return clone(backup);
}

/** DELETE /api/client/servers/{uuid}/backups/{backup} */
export async function deleteBackup(_uuid: string, backupUuid: string): Promise<void> {
    await latency();
    const i = backups.findIndex((b) => b.uuid === backupUuid);
    if (i >= 0 && backups[i].isLocked) throw new Error('Desbloquea la copia antes de eliminarla.');
    if (i >= 0) backups.splice(i, 1);
}

/** POST /api/client/servers/{uuid}/backups/{backup}/restore */
export async function restoreServerBackup(_uuid: string, backupUuid: string, _truncate: boolean): Promise<void> {
    await latency();
    if (!backups.some((b) => b.uuid === backupUuid)) throw new Error('La copia no existe');
    server.status = 'restoring_backup';
    window.setTimeout(() => {
        server.status = null;
        getMockSocket().emitEvent(SocketEvent.BACKUP_RESTORE_COMPLETED);
    }, rand(3000, 4500));
}
