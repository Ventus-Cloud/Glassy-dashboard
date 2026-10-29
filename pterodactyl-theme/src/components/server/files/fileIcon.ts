import type { FileObject } from '@/api/types';
import type { IconName } from '@/components/elements/Icon';

/** Icono y color según el tipo de archivo. */
export function fileIcon(file: FileObject): { icon: IconName; cls: string } {
    if (!file.isFile) return { icon: 'folder', cls: 'from-violet-400/40 to-fuchsia-500/15 text-violet-100 ring-violet-300/30' };
    if (file.isArchiveType()) return { icon: 'file-archive', cls: 'from-amber-400/35 to-orange-500/10 text-amber-200 ring-amber-300/25' };
    if (/\.jar$/i.test(file.name)) return { icon: 'coffee', cls: 'from-orange-400/35 to-rose-500/10 text-orange-200 ring-orange-300/25' };
    if (/\.(properties|ya?ml|json|toml|conf|cfg|ini)$/i.test(file.name)) return { icon: 'file-code', cls: 'from-cyan-400/30 to-sky-500/10 text-cyan-200 ring-cyan-300/25' };
    if (/\.(txt|log|md)$/i.test(file.name)) return { icon: 'file-text', cls: 'from-slate-300/25 to-slate-500/10 text-slate-200 ring-white/15' };
    return { icon: 'file', cls: 'from-slate-300/20 to-slate-500/5 text-slate-300 ring-white/10' };
}

export const KEY_FILES = new Set(['server.properties', 'eula.txt', 'bukkit.yml', 'spigot.yml', 'ops.json']);

export function languageOf(name: string): string {
    if (/\.ya?ml$/i.test(name)) return 'YAML';
    if (/\.json$/i.test(name)) return 'JSON';
    if (/\.properties$/i.test(name)) return 'Properties';
    if (/\.(sh|bash)$/i.test(name)) return 'Shell';
    if (/\.log$/i.test(name)) return 'Log';
    return 'Texto';
}

export const join = (dir: string, name: string) => `${dir.replace(/\/$/, '')}/${name}`;
