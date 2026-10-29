/**
 * Estado en memoria que simula el panel + Wings para la vista previa.
 * Nada de esto se usa al integrar el tema: allí los datos vienen de la API.
 */
import type { Allocation, Server, ServerBackup, ServerEggVariable } from '@/api/types';

export interface FsNode {
    name: string;
    isFile: boolean;
    size: number;
    mode: string;
    createdAt: Date;
    modifiedAt: Date;
    content?: string;
    children?: FsNode[];
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const byteLength = (s: string) => new TextEncoder().encode(s).length;

export function file(name: string, content: string | number, age = 60): FsNode {
    const text = typeof content === 'string' ? content : undefined;
    return {
        name,
        isFile: true,
        size: text !== undefined ? byteLength(text) : (content as number),
        content: text,
        mode: '-rw-r--r--',
        createdAt: minutesAgo(age + 4320),
        modifiedAt: minutesAgo(age),
    };
}

export function dir(name: string, children: FsNode[] = [], age = 120): FsNode {
    return { name, isFile: false, size: 4096, children, mode: 'drwxr-xr-x', createdAt: minutesAgo(age + 4320), modifiedAt: minutesAgo(age) };
}

export const touch = (node: FsNode, content?: string) => {
    if (content !== undefined) {
        node.content = content;
        node.size = byteLength(content);
    }
    node.modifiedAt = new Date();
};

/* ---------------------------------------------------------------------------
   Contenido de archivos de ejemplo
   --------------------------------------------------------------------------- */
const SERVER_PROPERTIES = `#Minecraft server properties
#Tue Oct 28 14:05:57 UTC 2026
accepts-transfers=false
allow-flight=false
allow-nether=true
broadcast-console-to-ops=true
difficulty=normal
enable-command-block=false
enable-query=true
enable-rcon=false
enforce-secure-profile=true
gamemode=survival
generate-structures=true
hardcore=false
level-name=world
level-seed=
level-type=minecraft\\:normal
max-players=50
motd=\\u00A7d\\u00A7lGlassy SMP \\u00A77\\u00B7 \\u00A7fSurvival 1.21.1
network-compression-threshold=256
online-mode=true
op-permission-level=4
pvp=true
query.port=25565
server-ip=0.0.0.0
server-port=25565
simulation-distance=10
spawn-protection=16
view-distance=10
white-list=false
`;

const EULA = `#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://aka.ms/MinecraftEULA).
#Tue Oct 28 14:05:57 UTC 2026
eula=true
`;

const OPS = `[
  {
    "uuid": "5b2f9c1e-7d3a-4c8b-9f21-0a6e4d2b8c13",
    "name": "Kirax",
    "level": 4,
    "bypassesPlayerLimit": false
  }
]
`;

const BUKKIT = `settings:
  allow-end: true
  warn-on-overload: true
  permissions-file: permissions.yml
  update-folder: update
  shutdown-message: Server closed
  minimum-api: none
spawn-limits:
  monsters: 70
  animals: 10
  water-animals: 5
  ambient: 15
chunk-gc:
  period-in-ticks: 600
ticks-per:
  animal-spawns: 400
  monster-spawns: 1
  autosave: 6000
`;

const SPIGOT = `settings:
  debug: false
  bungeecord: false
  restart-on-crash: true
  restart-script: ./start.sh
  netty-threads: 4
  timeout-time: 60
world-settings:
  default:
    view-distance: default
    mob-spawn-range: 8
    entity-activation-range:
      animals: 32
      monsters: 32
      villagers: 32
    merge-radius:
      item: 2.5
      exp: 3.0
`;

const PAPER_GLOBAL = `_version: 29
chunk-loading-basic:
  player-max-chunk-generate-rate: -1.0
  player-max-chunk-load-rate: 100.0
chunk-system:
  io-threads: -1
  worker-threads: -1
console:
  enable-brigadier-completions: true
  has-all-permissions: false
misc:
  max-joins-per-tick: 5
  region-file-cache-size: 256
watchdog:
  early-warning-delay: 10000
  early-warning-every: 5000
`;

const ESSENTIALS = `# EssentialsX — configuración principal
ops-name-color: '4'
nickname-prefix: '~'
max-nick-length: 15
teleport-cooldown: 0
teleport-delay: 3
heal-cooldown: 60
spawn-on-join: false
kits:
  tools:
    delay: 10
    items:
      - stone_pickaxe 1
      - stone_shovel 1
      - stone_axe 1
economy:
  starting-balance: 500
  currency-symbol: '$'
`;

const LUCKPERMS = `# LuckPerms — almacenamiento
server: survival
storage-method: h2
sync-minutes: -1
watch-files: true
messaging-service: auto
`;

const LATEST_LOG = `[14:05:49] [ServerMain/INFO]: Environment: Environment[sessionHost=https://sessionserver.mojang.com, servicesHost=https://api.minecraftservices.com, name=PROD]
[14:05:51] [ServerMain/INFO]: Loaded 1290 recipes
[14:05:52] [Server thread/INFO]: Starting minecraft server version 1.21.1
[14:05:52] [Server thread/INFO]: Default game type: SURVIVAL
[14:05:57] [Server thread/INFO]: Done (7.842s)! For help, type "help"
`;

const README = `Archivos de ejemplo de la vista previa del tema Glassy.
Edita eula.txt o renombra server.jar y vuelve a iniciar el servidor para ver cómo reacciona la consola.
`;

const PERMISSIONS_EMPTY = '';

/* ---------------------------------------------------------------------------
   Sistema de archivos (/home/container)
   --------------------------------------------------------------------------- */
export const fsRoot: FsNode = dir('/', [
    dir('cache', [file('mojang_1.21.1.jar', 52_403_118, 4400)], 4400),
    dir('config', [file('paper-global.yml', PAPER_GLOBAL, 2900), file('paper-world-defaults.yml', 18_412, 2900)], 2900),
    dir('libraries', [dir('com', [], 4400), dir('io', [], 4400), dir('org', [], 4400)], 4400),
    dir('logs', [file('latest.log', LATEST_LOG, 2), file('2026-10-28-1.log.gz', 41_220, 1500), file('2026-10-27-1.log.gz', 38_904, 2900)], 2),
    dir(
        'plugins',
        [
            dir('Essentials', [file('config.yml', ESSENTIALS, 900), dir('userdata', [], 30)], 30),
            dir('LuckPerms', [file('config.yml', LUCKPERMS, 2800), file('luckperms-h2-v2.mv.db', 1_310_720, 12)], 12),
            dir('WorldEdit', [file('config.yml', 6_204, 2800)], 2800),
            file('EssentialsX-2.21.0.jar', 3_412_118, 2800),
            file('LuckPerms-Bukkit-5.4.141.jar', 2_204_331, 2800),
            file('worldedit-bukkit-7.3.6.jar', 7_118_402, 2800),
        ],
        30,
    ),
    dir('world', [dir('region', [file('r.0.0.mca', 9_437_184, 3), file('r.-1.0.mca', 7_340_032, 3), file('r.0.-1.mca', 6_291_456, 5)], 3), dir('playerdata', [], 3), file('level.dat', 4_812, 3), file('session.lock', 3, 134)], 3),
    dir('world_nether', [dir('DIM-1', [], 40), file('level.dat', 4_620, 40)], 40),
    dir('world_the_end', [dir('DIM1', [], 380), file('level.dat', 4_590, 380)], 380),
    file('backup-semanal.zip', 1_288_490_188, 4300),
    file('banned-ips.json', '[]\n', 4400),
    file('banned-players.json', '[]\n', 4400),
    file('bukkit.yml', BUKKIT, 2900),
    file('commands.yml', 1_204, 4400),
    file('eula.txt', EULA, 4400),
    file('help.yml', 2_576, 4400),
    file('ops.json', OPS, 1500),
    file('permissions.yml', PERMISSIONS_EMPTY, 4400),
    file('README.txt', README, 10),
    file('server.jar', 49_283_112, 2900),
    file('server.properties', SERVER_PROPERTIES, 134),
    file('spigot.yml', SPIGOT, 2900),
    file('usercache.json', 6_402, 5),
    file('whitelist.json', '[]\n', 4400),
]);

export function diskUsage(node: FsNode = fsRoot): number {
    if (node.isFile) return node.size;
    return (node.children ?? []).reduce((a, c) => a + diskUsage(c), 0);
}

/* ---------------------------------------------------------------------------
   Servidor, startup y red
   --------------------------------------------------------------------------- */
export const STARTUP_TEMPLATE =
    'java -Xms128M -XX:MaxRAMPercentage=95.0 {{JVM_FLAGS}} -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}';

export const DOCKER_IMAGES: Record<string, string> = {
    'Java 21': 'ghcr.io/pterodactyl/yolks:java_21',
    'Java 17': 'ghcr.io/pterodactyl/yolks:java_17',
    'Java 16': 'ghcr.io/pterodactyl/yolks:java_16',
    'Java 11': 'ghcr.io/pterodactyl/yolks:java_11',
    'Java 8': 'ghcr.io/pterodactyl/yolks:java_8',
};

const variables: ServerEggVariable[] = [
    {
        name: 'Archivo JAR del servidor',
        description: 'Nombre del .jar que se ejecuta al iniciar. Debe existir en la raíz del servidor.',
        envVariable: 'SERVER_JARFILE',
        defaultValue: 'server.jar',
        serverValue: 'server.jar',
        isEditable: true,
        rules: ['required', 'regex:/^([\\w\\d._-]+)(\\.jar)$/'],
    },
    {
        name: 'Versión de Minecraft',
        description: 'Versión que descarga el instalador. Usa «latest» para la más reciente.',
        envVariable: 'MINECRAFT_VERSION',
        defaultValue: 'latest',
        serverValue: '1.21.1',
        isEditable: true,
        rules: ['nullable', 'string', 'max:20'],
    },
    {
        name: 'Build de Paper',
        description: 'Número de build de Paper a instalar, o «latest».',
        envVariable: 'BUILD_NUMBER',
        defaultValue: 'latest',
        serverValue: '130',
        isEditable: true,
        rules: ['required', 'string', 'max:20'],
    },
    {
        name: 'Argumentos de inicio (JVM)',
        description: 'Flags extra para la JVM. Los flags de Aikar mejoran el rendimiento del recolector G1.',
        envVariable: 'JVM_FLAGS',
        defaultValue: '-XX:+UseG1GC',
        serverValue: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch',
        isEditable: true,
        rules: ['nullable', 'string', 'max:512'],
    },
    {
        name: 'Actualizar al iniciar',
        description: 'Descarga el último build de Paper antes de cada arranque.',
        envVariable: 'AUTO_UPDATE',
        defaultValue: '0',
        serverValue: '1',
        isEditable: true,
        rules: ['required', 'boolean'],
    },
    {
        name: 'Ruta de descarga',
        description: 'URL personalizada para descargar el servidor. Solo la puede cambiar un administrador.',
        envVariable: 'DL_PATH',
        defaultValue: '',
        serverValue: null,
        isEditable: false,
        rules: ['nullable', 'string'],
    },
];

const allocations: Allocation[] = [
    { id: 41, ip: '203.0.113.42', alias: 'play.glassy.gg', port: 25565, notes: 'Puerto del juego', isDefault: true },
    { id: 42, ip: '203.0.113.42', alias: null, port: 25566, notes: 'Mapa web (BlueMap)', isDefault: false },
    { id: 43, ip: '203.0.113.42', alias: null, port: 25575, notes: 'RCON', isDefault: false },
];

export const server: Server = {
    identifier: '8f3a2c1e',
    uuid: '8f3a2c1e-5b7d-4e2a-9c61-3f0b7a2d91e4',
    name: 'Survival SMP',
    description: 'Survival con economía, protecciones y eventos los sábados.',
    node: 'fra-01',
    status: null,
    sftpDetails: { ip: 'fra-01.panel.local', port: 2022 },
    invocation: '',
    dockerImage: DOCKER_IMAGES['Java 21'],
    limits: { memory: 12288, swap: 0, disk: 51200, io: 500, cpu: 400, threads: null },
    featureLimits: { databases: 2, allocations: 5, backups: 5 },
    allocations,
    variables,
    egg: { name: 'Paper', nest: 'Minecraft', game: 'Minecraft: Java Edition' },
    maxPlayers: 50,
    sftpUsername: 'alex.8f3a2c1e',
};

export const primaryAllocation = () => server.allocations.find((a) => a.isDefault) ?? server.allocations[0];

export const variableValue = (env: string) => {
    const v = server.variables.find((x) => x.envVariable === env);
    return v ? (v.serverValue ?? v.defaultValue) : '';
};

/** Sustituye {{VARIABLES}} igual que hace el panel al mostrar `invocation`. */
export function resolveInvocation(template = STARTUP_TEMPLATE): string {
    return template
        .replace(/{{\s*SERVER_MEMORY\s*}}/g, String(server.limits.memory))
        .replace(/{{\s*SERVER_PORT\s*}}/g, String(primaryAllocation().port))
        .replace(/{{\s*([A-Z0-9_]+)\s*}}/g, (_, env: string) => variableValue(env))
        .replace(/\s+/g, ' ')
        .trim();
}
server.invocation = resolveInvocation();

export const backups: ServerBackup[] = [
    {
        uuid: 'b7e1c0d2-41aa-4f0e-9c2d-6a8f0e1b2c33',
        isSuccessful: true,
        isLocked: true,
        name: 'Copia automática diaria',
        ignoredFiles: 'logs/\ncache/',
        checksum: 'sha1:3f9a1c0be47d2a6e81f04c9b7d5e2a1f6c8b0d4e',
        bytes: 2_576_980_377,
        createdAt: minutesAgo(372),
        completedAt: minutesAgo(370),
    },
    {
        uuid: 'c2f4a9e1-0b7d-4c55-8e19-2d7a3f6b1e08',
        isSuccessful: true,
        isLocked: false,
        name: 'Antes de actualizar a 1.21.1',
        ignoredFiles: '',
        checksum: 'sha1:9b2e4d1a07c3f8e6a5d4c2b1e0f9a8d7c6b5a4e3',
        bytes: 2_254_857_830,
        createdAt: minutesAgo(4310),
        completedAt: minutesAgo(4306),
    },
];
