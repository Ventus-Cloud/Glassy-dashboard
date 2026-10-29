import { memo } from 'react';
import type { FileObject } from '@/api/types';
import Icon from '@/components/elements/Icon';
import type { MenuAnchor } from '@/components/elements/FloatingMenu';
import { fileIcon, KEY_FILES } from '@/components/server/files/fileIcon';
import { bytesToString, cx, formatDate, relativeTime } from '@/lib/format';

interface Props {
    file: FileObject;
    selected: boolean;
    onToggle: (name: string) => void;
    onOpen: (file: FileObject) => void;
    onMenu: (file: FileObject, anchor: MenuAnchor) => void;
}

export const GRID = 'grid-cols-[auto_minmax(0,1fr)_auto] md:grid-cols-[auto_minmax(0,1fr)_7.5rem_9.5rem_auto]';

/** Fila del explorador (como FileObjectRow del panel). Clic derecho abre el menú. */
function FileObjectRow({ file, selected, onToggle, onOpen, onMenu }: Props) {
    const { icon, cls } = fileIcon(file);
    const openable = !file.isFile || file.isEditable();

    return (
        <div
            className={cx('file-row group', GRID)}
            data-selected={selected}
            onContextMenu={(e) => {
                e.preventDefault();
                onMenu(file, { x: e.clientX, y: e.clientY });
            }}
        >
            <label className='grid h-5 w-5 place-items-center'>
                <input type='checkbox' checked={selected} onChange={() => onToggle(file.name)} className='peer sr-only' aria-label={`Seleccionar ${file.name}`} />
                <span className='grid h-4.5 w-4.5 place-items-center rounded-md border border-white/20 bg-white/[0.04] text-transparent transition peer-checked:border-fuchsia-300/60 peer-checked:bg-linear-to-br peer-checked:from-violet-500 peer-checked:to-fuchsia-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-violet-400/60'>
                    <Icon name='check' className='h-3 w-3' strokeWidth={3} />
                </span>
            </label>

            <button
                onClick={(e) => (openable ? onOpen(file) : onMenu(file, e.currentTarget.getBoundingClientRect()))}
                className='flex min-w-0 items-center gap-3 text-left'
                title={file.name}
            >
                <span className={cx('icon-tile h-9 w-9 transition-transform duration-300 group-hover:scale-105', cls)}>
                    <Icon name={icon} className='h-4 w-4' />
                </span>
                <span className='min-w-0'>
                    <span className='flex items-center gap-2'>
                        <span className={cx('truncate text-[13px] font-medium', openable ? 'text-slate-100 group-hover:text-white' : 'text-slate-300')}>{file.name}</span>
                        {KEY_FILES.has(file.name) && <span className='shrink-0 rounded-md bg-fuchsia-400/15 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-200 ring-1 ring-fuchsia-400/25'>config</span>}
                    </span>
                    <span className='block truncate font-mono text-[11px] text-slate-500 md:hidden'>
                        {file.isFile ? bytesToString(file.size) : 'Carpeta'} · {relativeTime(file.modifiedAt)}
                    </span>
                    <span className='hidden font-mono text-[11px] text-slate-500 md:block'>{file.mode}</span>
                </span>
            </button>

            <span className='hidden text-right font-mono text-xs text-slate-400 md:block'>{file.isFile ? bytesToString(file.size) : '—'}</span>
            <span className='hidden text-right text-xs text-slate-400 md:block' title={formatDate(file.modifiedAt)}>
                {relativeTime(file.modifiedAt)}
            </span>

            <button
                onClick={(e) => onMenu(file, e.currentTarget.getBoundingClientRect())}
                className='grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white'
                aria-label={`Acciones para ${file.name}`}
                aria-haspopup='menu'
            >
                <Icon name='more' className='h-4 w-4' strokeWidth={2.4} />
            </button>
        </div>
    );
}

export default memo(FileObjectRow);
