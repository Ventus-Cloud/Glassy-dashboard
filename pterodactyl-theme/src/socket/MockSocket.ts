/**
 * Simulación del websocket de Wings para la vista previa.
 *
 * Emite los mismos eventos y cargas útiles que el daemon real (`console output`,
 * `status`, `stats` en JSON, `install *`, `backup completed`), así que los
 * componentes no saben si hablan con esto o con Wings. Lee el estado del mock
 * (imagen Docker, variables, asignación principal, eula.txt, server.jar), por lo
 * que los cambios hechos en las pestañas Inicio, Archivos o Red afectan al
 * siguiente arranque.
 */
import type { PowerAction, PowerState, ServerStats } from '@/api/types';
import { diskUsage, fsRoot, primaryAllocation, resolveInvocation, server, touch, variableValue } from '@/api/mock/db';
import { SocketEvent, SocketRequest, type SocketLike } from '@/socket/events';
import { clamp, mibToBytes, pick, rand, randi, timestamp } from '@/lib/format';

type Listener = (data: string) => void;
type Step = [event: SocketEvent, data: string, delay?: number];

const NAMES = ['Kirax', 'LunaCraft', 'PixelPablo', 'Ender_Queen', 'Redstone_Rafa', 'MossyMiner', 'Nebula_77', 'DiamondDiego', 'Sofi_Builds', 'TorchBearer', 'VoidWalker', 'Aurora_mc', 'BlazeRunner', 'Quartzy', 'MapacheMC', 'xXSteveXx', 'GhastBuster', 'CreeperChan', 'NetherNico', 'Alex_Vega', 'Biomasa', 'OakLeaf', 'Frostbyte', 'Cobble_King'];
const CHAT = ['¿alguien tiene hierro de sobra?', 'voy al nether, ¿quién se apunta?', 'gg', 'la granja de aldeanos ya está lista', 'lag?', 'buenas a todos!', '¿dónde está la tienda del spawn?', 'cuidado con los creepers jaja', '¿alguien me presta unas elytras?', 'ya terminé el castillo, venid a verlo', '¿hacemos el raid del End esta noche?'];
const ADVANCEMENTS = ['Diamonds!', 'We Need to Go Deeper', 'Monster Hunter', 'Hot Stuff', 'Ice Bucket Challenge', 'Return to Sender', 'Sweet Dreams'];
const DEATHS = ['was slain by Zombie', 'was blown up by Creeper', 'fell from a high place', 'tried to swim in lava', 'was shot by Skeleton', 'drowned'];

const log = (msg: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO', at = new Date()) => `[${timestamp(at)} ${level}]: ${msg}`;
const playerIp = () => `198.51.100.${randi(2, 254)}:${randi(40000, 60000)}`;

/** Java mínimo que pide cada versión de Minecraft. */
function requiredJava(mc: string): number {
    const [, minor = 0, patch = 0] = mc.split('.').map(Number);
    if (minor > 20 || (minor === 20 && patch >= 5)) return 21;
    if (minor >= 18) return 17;
    if (minor === 17) return 16;
    return 8;
}

export class MockSocket implements SocketLike {
    private listeners = new Map<string, Set<Listener>>();
    private state: PowerState = 'running';
    private startedAt: number | null = Date.now() - (2 * 3600 + 14 * 60 + 33) * 1000;
    private history: string[] = [];
    private players: string[] = [];
    private sequence: object | null = null;
    private installing = false;
    private cpu = 0;
    private memory = 0;
    private rx = 18_400_000_000;
    private tx = 7_200_000_000;
    private nextAmbient = Date.now() + 4000;

    constructor() {
        this.seedHistory();
        this.cpu = 46;
        this.memory = mibToBytes(6400);
        window.setInterval(() => this.tick(), 1000);
    }

    /* ------------------------------------------------------------------ API */
    addListener(event: string, listener: Listener) {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set());
        this.listeners.get(event)!.add(listener);
    }

    removeListener(event: string, listener: Listener) {
        this.listeners.get(event)?.delete(listener);
    }

    send(event: string, payload?: string) {
        switch (event) {
            case SocketRequest.SEND_LOGS:
                this.history.forEach((line) => this.emit(SocketEvent.CONSOLE_OUTPUT, line, false));
                break;
            case SocketRequest.SEND_STATS:
                this.emitStats();
                break;
            case SocketRequest.SET_STATE:
                this.power(payload as PowerAction);
                break;
            case SocketRequest.SEND_COMMAND:
                this.command(payload ?? '');
                break;
        }
    }

    /** Lo usa la API simulada (reinstalar, copias de seguridad). */
    emitEvent(event: SocketEvent, data = '') {
        this.emit(event, data, false);
    }

    get isRunning() {
        return this.state === 'running';
    }

    /* ------------------------------------------------------------ internos */
    private emit(event: SocketEvent, data = '', record = true) {
        if (record && event === SocketEvent.CONSOLE_OUTPUT) {
            this.history.push(data);
            if (this.history.length > 150) this.history.shift();
        }
        this.listeners.get(event)?.forEach((fn) => fn(data));
    }

    private out(msg: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
        this.emit(SocketEvent.CONSOLE_OUTPUT, log(msg, level));
    }

    private setState(state: PowerState) {
        this.state = state;
        this.emit(SocketEvent.STATUS, state);
        this.emitStats();
    }

    private run(steps: Step[], done?: () => void) {
        const token = {};
        this.sequence = token;
        let i = 0;
        const step = () => {
            if (this.sequence !== token) return;
            if (i >= steps.length) {
                this.sequence = null;
                done?.();
                return;
            }
            const [event, data, delay] = steps[i++];
            this.emit(event, data);
            window.setTimeout(step, delay ?? randi(60, 200));
        };
        step();
    }

    private seedHistory() {
        const base = this.startedAt! - 9000;
        this.bootSteps().forEach(([event, data], i) => {
            if (event === SocketEvent.CONSOLE_OUTPUT) this.history.push(data.replace(/^\[\d{2}:\d{2}:\d{2}/, `[${timestamp(new Date(base + i * 210))}`));
        });
        let at = new Date(Date.now() - 62 * 60_000);
        for (let i = 0; i < 14; i++) {
            const name = this.freeName();
            this.players.push(name);
            at = new Date(at.getTime() + randi(150, 330) * 1000);
            this.history.push(log(`${name}[/${playerIp()}] logged in with entity id ${randi(100, 9999)} at ([world]${rand(-900, 900).toFixed(1)}, ${randi(62, 118)}.0, ${rand(-900, 900).toFixed(1)})`, 'INFO', at));
            this.history.push(log(`${name} joined the game`, 'INFO', at));
            if (i % 4 === 2) this.history.push(log(`<${name}> ${pick(CHAT)}`, 'INFO', new Date(at.getTime() + 40_000)));
        }
    }

    private freeName() {
        const free = NAMES.filter((n) => !this.players.includes(n));
        return free.length ? pick(free) : `${pick(NAMES)}${randi(2, 99)}`;
    }

    /* --------------------------------------------------------------- energía */
    private bootSteps(): Step[] {
        const C = SocketEvent.CONSOLE_OUTPUT;
        const D = SocketEvent.DAEMON_MESSAGE;
        const java = Number(/java_(\d+)/.exec(server.dockerImage)?.[1] ?? 21);
        const mc = variableValue('MINECRAFT_VERSION').replace('latest', '1.21.1') || '1.21.1';
        const jar = variableValue('SERVER_JARFILE') || 'server.jar';
        const port = primaryAllocation().port;
        const steps: Step[] = [
            [D, 'Checking server disk space usage, this could take a few seconds...'],
            [D, 'Updated process configuration file.'],
            [D, 'Ensuring file permissions are set correctly, this could take a few seconds...'],
            [D, 'Pulling Docker container image, this could take a few minutes to complete...'],
            [D, 'Finished pulling Docker container image', 380],
            [C, `openjdk version "${java}.0.4" 2024-07-16 LTS`],
            [D, resolveInvocation()],
        ];

        if (!fsRoot.children?.some((n) => n.isFile && n.name === jar)) {
            return [...steps, [C, `Error: Unable to access jarfile ${jar}`, 300]];
        }
        if (java < requiredJava(mc)) {
            return [
                ...steps,
                [C, 'Error: LinkageError occurred while loading main class io.papermc.paperclip.Main'],
                [C, `\tjava.lang.UnsupportedClassVersionError: io/papermc/paperclip/Main has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to ${java + 44}.0`, 300],
            ];
        }

        const eula = fsRoot.children?.find((n) => n.name === 'eula.txt');
        const accepted = !!eula?.content && /^\s*eula\s*=\s*true\s*$/m.test(eula.content);
        const out = (msg: string, delay?: number, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): Step => [C, log(msg, level), delay];

        steps.push(
            out(`Loading Paper ${mc}-${variableValue('BUILD_NUMBER')}-master@b48403b (2024-10-23T14:01:11Z) for Minecraft ${mc}`, 300),
            out(`[bootstrap] Running Java ${java} (OpenJDK 64-Bit Server VM ${java}.0.4+7-LTS; Eclipse Adoptium Temurin-${java}.0.4+7) on Linux 6.1.0-26-amd64 (amd64)`),
        );
        if (!accepted) {
            return [...steps, out('Failed to load eula.txt', 120, 'WARN'), out('You need to agree to the EULA in order to run the server. Go to eula.txt for more info.', 300)];
        }

        steps.push(
            out('Loaded 1290 recipes'),
            out('Loaded 1399 advancements', 240),
            out(`Starting minecraft server version ${mc}`),
            out('Loading properties'),
            out(`This server is running Paper version ${mc}-${variableValue('BUILD_NUMBER')}-master@b48403b`),
            out('Using 4 threads for Netty based IO'),
            out('Default game type: SURVIVAL'),
            out('Generating keypair'),
            out(`Starting Minecraft server on 0.0.0.0:${port}`),
            out('Using epoll channel type'),
            out('Paper: Using libdeflate (Linux x86_64) compression from Velocity.'),
            out('[LuckPerms] Loading server plugin LuckPerms v5.4.141'),
            out('[Essentials] Loading server plugin Essentials v2.21.0'),
            out('[WorldEdit] Loading server plugin WorldEdit v7.3.6'),
            out('Preparing level "world"', 400),
            out('Preparing start region for dimension minecraft:overworld'),
            out(`Time elapsed: ${randi(1800, 2600)} ms`, 300),
            out('Preparing start region for dimension minecraft:the_nether'),
            out(`Time elapsed: ${randi(380, 640)} ms`),
            out('Preparing start region for dimension minecraft:the_end'),
            out(`Time elapsed: ${randi(300, 480)} ms`),
            out('[LuckPerms] Enabling LuckPerms v5.4.141'),
            out('[Essentials] Enabling Essentials v2.21.0'),
            out('[WorldEdit] Using legacy block mappings; consider updating your schematics.', undefined, 'WARN'),
            out('Running delayed init tasks'),
            out(`Done (${rand(6, 9).toFixed(3)}s)! For help, type "help"`, 260),
        );
        return steps;
    }

    private stopSteps(): Step[] {
        const out = (msg: string, delay?: number): Step => [SocketEvent.CONSOLE_OUTPUT, log(msg), delay];
        return [
            out('Stopping the server'),
            out('Stopping server'),
            ...this.players.slice(0, 4).map((p) => out(`${p} lost connection: Server closed`, 40)),
            out('[Essentials] Disabling Essentials v2.21.0'),
            out('[LuckPerms] Disabling LuckPerms v5.4.141'),
            out('Saving players'),
            out('Saving worlds', 300),
            out("Saving chunks for level 'ServerLevel[world]'/minecraft:overworld"),
            out("Saving chunks for level 'ServerLevel[world_nether]'/minecraft:the_nether"),
            out("Saving chunks for level 'ServerLevel[world_the_end]'/minecraft:the_end"),
            out('ThreadedAnvilChunkStorage: All dimensions are saved', 260),
            out('Flushing Chunk IO'),
            out('Closing Thread Pool'),
            out('Closing Server'),
        ];
    }

    private power(action: PowerAction) {
        if (this.installing) return;
        if (action === 'start' && this.state === 'offline') this.start();
        else if (action === 'stop' && (this.state === 'running' || this.state === 'starting')) this.stop();
        else if (action === 'restart' && this.state !== 'stopping') this.state === 'offline' ? this.start() : this.stop(() => this.start());
        else if (action === 'kill' && this.state !== 'offline') this.kill();
    }

    private start() {
        this.setState('starting');
        this.syncServerProperties();
        const steps = this.bootSteps();
        const ok = steps[steps.length - 1][1].includes('Done (');
        this.run(steps, () => {
            if (!ok) {
                window.setTimeout(() => this.setState('offline'), 200);
                return;
            }
            this.startedAt = Date.now();
            this.nextAmbient = Date.now() + 2500;
            this.setState('running');
        });
    }

    private stop(then?: () => void) {
        const steps = this.stopSteps();
        this.players = [];
        this.setState('stopping');
        this.run(steps, () => {
            this.startedAt = null;
            this.setState('offline');
            if (then) window.setTimeout(then, 600);
        });
    }

    private kill() {
        this.sequence = null;
        this.players = [];
        this.startedAt = null;
        this.setState('offline');
    }

    /** Wings reescribe server-port con la asignación principal antes de arrancar. */
    private syncServerProperties() {
        const props = fsRoot.children?.find((n) => n.name === 'server.properties');
        if (!props?.content) return;
        const port = primaryAllocation().port;
        touch(props, props.content.replace(/^server-port=.*$/m, `server-port=${port}`).replace(/^query\.port=.*$/m, `query.port=${port}`));
    }

    /** Reinstalación: corre el script del egg en un contenedor aparte. */
    reinstall(done: () => void) {
        if (this.state !== 'offline') this.kill();
        this.installing = true;
        const I = SocketEvent.INSTALL_OUTPUT;
        const mc = variableValue('MINECRAFT_VERSION').replace('latest', '1.21.1') || '1.21.1';
        const build = variableValue('BUILD_NUMBER');
        const jar = variableValue('SERVER_JARFILE') || 'server.jar';
        this.emit(SocketEvent.INSTALL_STARTED);
        this.run(
            [
                [I, 'Installing server using the egg install script (ghcr.io/pterodactyl/installers:alpine)', 300],
                [I, 'fetch https://dl-cdn.alpinelinux.org/alpine/v3.20/main/x86_64/APKINDEX.tar.gz'],
                [I, 'OK: 14 MiB in 22 packages', 260],
                [I, `Version being downloaded: MC ${mc} · build ${build}`],
                [I, `JAR Name of Build: paper-${mc}-${build}.jar`],
                [I, 'Downloading the latest Paper version'],
                [I, `curl -o ${jar} https://api.papermc.io/v2/projects/paper/versions/${mc}/builds/${build}/downloads/paper-${mc}-${build}.jar`],
                [I, '  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current'],
                [I, '100 47.0M  100 47.0M    0     0  38.2M      0  0:00:01  0:00:01 --:--:-- 38.3M', 500],
                [I, 'Checking for server.properties'],
                [I, 'Install completed', 300],
            ],
            () => {
                this.installing = false;
                this.emit(SocketEvent.INSTALL_COMPLETED);
                done();
            },
        );
    }

    /* -------------------------------------------------------------- comandos */
    private command(raw: string) {
        if (this.state !== 'running') return;
        const cmd = raw.trim().replace(/^\//, '');
        if (!cmd) return;
        const [name, ...args] = cmd.split(/\s+/);
        const reply = (msg: string, level: 'INFO' | 'WARN' = 'INFO') => window.setTimeout(() => this.out(msg, level), randi(40, 140));

        switch (name.toLowerCase()) {
            case 'help':
            case '?':
                reply('--------- Help: Index (1/9) --------------------');
                ['/list: Lists players on the server', '/say <message>: Broadcasts a message', '/kick <player> [reason]: Kicks a player', '/op <player>: Grants operator status', '/time set <day|night>: Changes the time', '/weather <clear|rain|thunder>: Sets the weather', '/save-all: Saves the server to disk', '/tps: Shows the server TPS', '/version: Shows the server version', '/stop: Stops the server']
                    .forEach((l) => reply(l));
                break;
            case 'list':
                reply(`There are ${this.players.length} of a max of ${server.maxPlayers} players online: ${this.players.join(', ')}`);
                break;
            case 'say':
                reply(args.length ? `[Server] ${args.join(' ')}` : 'Usage: /say <message>', args.length ? 'INFO' : 'WARN');
                break;
            case 'kick': {
                const i = this.players.findIndex((p) => p.toLowerCase() === (args[0] ?? '').toLowerCase());
                if (i < 0) {
                    reply(args[0] ? `No player was found` : 'Usage: /kick <player> [reason]', 'WARN');
                    break;
                }
                const [p] = this.players.splice(i, 1);
                reply(`Kicked ${p}: ${args.slice(1).join(' ') || 'Kicked by an operator'}`);
                reply(`${p} left the game`);
                break;
            }
            case 'op':
                reply(this.players.some((p) => p.toLowerCase() === (args[0] ?? '').toLowerCase()) ? `Made ${args[0]} a server operator` : 'That player does not exist', args[0] ? 'INFO' : 'WARN');
                break;
            case 'time':
                reply(`Set the time to ${args[1] === 'night' ? 13000 : 1000}`);
                break;
            case 'weather':
                reply(({ rain: 'Set the weather to rain', thunder: 'Set the weather to rain & thunder' } as Record<string, string>)[args[0]] ?? 'Set the weather to clear');
                break;
            case 'save-all':
                reply('Saving the game (this may take a moment!)');
                window.setTimeout(() => this.state === 'running' && this.out('Saved the game'), 900);
                break;
            case 'tps': {
                const tps = this.tps();
                reply(`TPS from last 1m, 5m, 15m: ${tps.toFixed(1)}, ${Math.min(20, tps + 0.02).toFixed(1)}, ${Math.max(0, tps - 0.03).toFixed(2)}`);
                break;
            }
            case 'version':
            case 'ver':
                reply(`This server is running Paper version ${variableValue('MINECRAFT_VERSION')}-${variableValue('BUILD_NUMBER')}-master@b48403b (Implementing API version 1.21.1-R0.1-SNAPSHOT)`);
                break;
            case 'stop':
                this.stop();
                break;
            case 'restart':
                this.stop(() => this.start());
                break;
            default:
                reply('Unknown or incomplete command, see below for error', 'WARN');
                reply(`${cmd}<--[HERE]`, 'WARN');
        }
    }

    /* ------------------------------------------------- eventos y estadísticas */
    private ambient() {
        const r = Math.random();
        if (r < 0.2 || this.players.length < 3) {
            if (this.players.length >= server.maxPlayers) return;
            const name = this.freeName();
            this.players.push(name);
            this.out(`${name}[/${playerIp()}] logged in with entity id ${randi(100, 9999)} at ([world]${rand(-900, 900).toFixed(1)}, ${randi(62, 118)}.0, ${rand(-900, 900).toFixed(1)})`);
            this.out(`${name} joined the game`);
            return;
        }
        if (r < 0.33 && this.players.length > 5) {
            const [p] = this.players.splice(randi(0, this.players.length - 1), 1);
            this.out(`${p} lost connection: Disconnected`);
            this.out(`${p} left the game`);
            return;
        }
        const p = pick(this.players);
        if (r < 0.7) this.out(`<${p}> ${pick(CHAT)}`);
        else if (r < 0.8) this.out(`${p} has made the advancement [${pick(ADVANCEMENTS)}]`);
        else if (r < 0.9) this.out(`${p} ${pick(DEATHS)}`);
        else if (r < 0.97) {
            this.out('Saving the game (this may take a moment!)');
            window.setTimeout(() => this.state === 'running' && this.out('Saved the game'), 900);
        } else this.out(`Can't keep up! Is the server overloaded? Running ${randi(2010, 3400)}ms or ${randi(40, 68)} ticks behind`, 'WARN');
    }

    private tps() {
        return clamp(20 - Math.max(0, (this.cpu / server.limits.cpu) * 100 - 72) * 0.07 - rand(0, 0.05), 12, 20);
    }

    private tick() {
        const limit = server.limits.cpu;
        const base = mibToBytes(server.limits.memory);
        const load = this.players.length / server.maxPlayers;
        let targetCpu = 0;
        let targetMem = 0;
        if (this.state === 'running') {
            targetCpu = limit * (0.1 + load * 0.25);
            targetMem = base * (0.45 + load * 0.2);
        } else if (this.state === 'starting') {
            targetCpu = limit * 0.85;
            targetMem = base * 0.35;
        } else if (this.state === 'stopping') {
            targetCpu = limit * 0.3;
            targetMem = base * 0.25;
        }

        if (this.state === 'offline') {
            this.cpu = Math.max(0, this.cpu * 0.3 - 0.5);
            this.memory = Math.max(0, this.memory * 0.4 - 1e6);
        } else {
            this.cpu = clamp(this.cpu + (targetCpu - this.cpu) * 0.25 + rand(-limit * 0.02, limit * 0.02), 1, limit * 0.99);
            if (this.state === 'running' && Math.random() < 0.03) this.cpu = clamp(this.cpu + limit * rand(0.12, 0.25), 1, limit * 0.99);
            this.memory = clamp(this.memory + (targetMem - this.memory) * 0.08 + rand(-0.004, 0.006) * base, 64e6, base * 0.97);
            if (this.state === 'running' && Math.random() < 0.03) this.memory *= 0.94; // GC
            this.rx += (this.players.length * 42_000 + 60_000) * rand(0.6, 1.4);
            this.tx += (this.players.length * 18_000 + 20_000) * rand(0.6, 1.4);
        }

        if (this.state === 'running' && Date.now() >= this.nextAmbient) {
            this.ambient();
            this.nextAmbient = Date.now() + rand(2400, 6500);
        }
        this.emitStats();
    }

    private emitStats() {
        const stats: ServerStats = {
            memory_bytes: Math.round(this.memory),
            memory_limit_bytes: mibToBytes(server.limits.memory),
            cpu_absolute: Number(this.cpu.toFixed(3)),
            disk_bytes: diskUsage(),
            network: { rx_bytes: Math.round(this.rx), tx_bytes: Math.round(this.tx) },
            state: this.state,
            uptime: this.startedAt && this.state === 'running' ? Date.now() - this.startedAt : 0,
        };
        this.emit(SocketEvent.STATS, JSON.stringify(stats));
    }
}

let instance: MockSocket | null = null;
export const getMockSocket = () => (instance ??= new MockSocket());
