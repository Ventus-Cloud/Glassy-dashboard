export const pad = (n: number) => String(n).padStart(2, '0');

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randi = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

/** Igual que bytesToString de Pterodactyl (unidades binarias). */
export function bytesToString(bytes: number, decimals = 1): string {
    if (bytes < 1) return '0 B';
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}

export const mibToBytes = (mib: number) => mib * 1024 * 1024;

export function formatUptime(ms: number): string {
    const t = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(t / 86400);
    const hms = `${pad(Math.floor((t % 86400) / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
    return d ? `${d}d ${hms}` : hms;
}

export function relativeTime(date: Date): string {
    const m = Math.round((Date.now() - date.getTime()) / 60000);
    if (m < 1) return 'ahora mismo';
    if (m < 60) return `hace ${m} min`;
    if (m < 1440) return `hace ${Math.floor(m / 60)} h`;
    const d = Math.floor(m / 1440);
    return d === 1 ? 'ayer' : `hace ${d} días`;
}

export const formatDate = (date: Date) =>
    date.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const hashHue = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360;

export const timestamp = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const ta = Object.assign(document.createElement('textarea'), { value: text });
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch {
            /* sin soporte */
        }
        ta.remove();
        return ok;
    }
}
