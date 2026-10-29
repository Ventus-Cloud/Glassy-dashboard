import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import type { FileObject } from '@/api/types';
import { compressFiles, copyFile, createDirectory, decompressFiles, deleteFiles, loadDirectory, renameFiles, uploadFile } from '@/api/server';
import Button from '@/components/elements/Button';
import { Input } from '@/components/elements/Field';
import FloatingMenu, { type MenuAnchor, type MenuItem } from '@/components/elements/FloatingMenu';
import Icon from '@/components/elements/Icon';
import { ConfirmDialog } from '@/components/elements/Modal';
import Spinner from '@/components/elements/Spinner';
import { useToast } from '@/components/elements/Toast';
import FileEditorModal from '@/components/server/files/FileEditorModal';
import FileManagerBreadcrumbs from '@/components/server/files/FileManagerBreadcrumbs';
import FileNameModal, { type NameMode } from '@/components/server/files/FileNameModal';
import FileObjectRow, { GRID } from '@/components/server/files/FileObjectRow';
import MassActionsBar from '@/components/server/files/MassActionsBar';
import { join } from '@/components/server/files/fileIcon';
import { ServerContext } from '@/state/server';
import { bytesToString, cx } from '@/lib/format';

type SortKey = 'name' | 'size' | 'modifiedAt';

interface Upload {
    id: number;
    name: string;
    size: number;
    progress: number;
}

interface Props {
    directory: string;
    onNavigate: (path: string) => void;
}

let uploadId = 0;

/** Pestaña «Archivos»: explorador de /home/container. */
export default function FileManagerContainer({ directory, onNavigate }: Props) {
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const toast = useToast();

    const [files, setFiles] = useState<FileObject[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });
    const [menu, setMenu] = useState<{ file: FileObject; anchor: MenuAnchor } | null>(null);
    const [naming, setNaming] = useState<{ mode: NameMode; file?: FileObject } | null>(null);
    const [editing, setEditing] = useState<{ path: string; isNew?: boolean } | null>(null);
    const [deleting, setDeleting] = useState<string[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [uploads, setUploads] = useState<Upload[]>([]);
    const [dragging, setDragging] = useState(false);
    const dragDepth = useRef(0);
    const picker = useRef<HTMLInputElement>(null);

    const reload = useCallback(async () => {
        if (!uuid) return;
        try {
            setFiles(await loadDirectory(uuid, directory));
            setError(null);
        } catch (e) {
            setError((e as Error).message);
            setFiles([]);
        }
    }, [uuid, directory]);

    useEffect(() => {
        setFiles(null);
        setSelected([]);
        setQuery('');
        reload();
    }, [reload]);

    const visible = useMemo(() => {
        const list = (files ?? []).filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));
        return list.sort((a, b) => {
            if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
            const av = sort.key === 'name' ? a.name.toLowerCase() : sort.key === 'size' ? a.size : a.modifiedAt.getTime();
            const bv = sort.key === 'name' ? b.name.toLowerCase() : sort.key === 'size' ? b.size : b.modifiedAt.getTime();
            return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
        });
    }, [files, query, sort]);

    const totals = useMemo(() => {
        const list = files ?? [];
        return { dirs: list.filter((f) => !f.isFile).length, files: list.filter((f) => f.isFile).length, bytes: list.reduce((a, f) => a + (f.isFile ? f.size : 0), 0) };
    }, [files]);

    /* ------------------------------------------------------------ acciones */
    const attempt = async (fn: () => Promise<unknown>, success?: string) => {
        try {
            await fn();
            if (success) toast({ title: success, tone: 'success' });
        } catch (e) {
            toast({ title: 'La operación falló', description: (e as Error).message, tone: 'error' });
        } finally {
            reload();
        }
    };

    const toggle = useCallback((name: string) => setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name])), []);

    const open = useCallback(
        (file: FileObject) => {
            if (!file.isFile) onNavigate(join(directory, file.name));
            else setEditing({ path: join(directory, file.name) });
        },
        [directory, onNavigate],
    );

    const openMenu = useCallback((file: FileObject, anchor: MenuAnchor) => setMenu({ file, anchor }), []);

    const compress = async (names: string[]) => {
        if (!uuid) return;
        setBusy(true);
        await attempt(async () => {
            const archive = await compressFiles(uuid, directory, names);
            toast({ title: 'Archivo comprimido', description: archive.name, tone: 'success', icon: 'archive' });
        });
        setSelected([]);
        setBusy(false);
    };

    const remove = async (names: string[]) => {
        if (!uuid) return;
        setBusy(true);
        await attempt(() => deleteFiles(uuid, directory, names), names.length === 1 ? `«${names[0]}» eliminado` : `${names.length} elementos eliminados`);
        setSelected((s) => s.filter((n) => !names.includes(n)));
        setDeleting(null);
        setBusy(false);
    };

    const startUploads = (list: FileList | File[]) => {
        if (!uuid) return;
        Array.from(list).forEach((upload) => {
            const id = ++uploadId;
            setUploads((u) => [...u, { id, name: upload.name, size: upload.size, progress: 0 }]);
            uploadFile(uuid, directory, upload, (progress) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress } : x))))
                .then(() => toast({ title: `${upload.name} subido`, description: bytesToString(upload.size), tone: 'success', icon: 'upload' }))
                .catch((e: Error) => toast({ title: `Error al subir ${upload.name}`, description: e.message, tone: 'error' }))
                .finally(() => {
                    setUploads((u) => u.filter((x) => x.id !== id));
                    reload();
                });
        });
    };

    const menuItems = (file: FileObject): MenuItem[] => [
        ...(file.isFile && file.isEditable() ? [{ label: 'Editar', icon: 'pencil' as const, onSelect: () => open(file) }] : []),
        ...(!file.isFile ? [{ label: 'Abrir', icon: 'folder' as const, onSelect: () => open(file) }] : []),
        { label: 'Renombrar', icon: 'file-text', onSelect: () => setNaming({ mode: 'rename', file }) },
        { label: 'Duplicar', icon: 'copy', onSelect: () => uuid && attempt(() => copyFile(uuid, join(directory, file.name)), `Copia de «${file.name}» creada`) },
        { label: 'Descargar', icon: 'download', disabled: !file.isFile, onSelect: () => toast({ title: `Descargando ${file.name}`, description: 'El panel genera un enlace firmado de Wings.', tone: 'info', icon: 'download' }) },
        'divider',
        file.isArchiveType()
            ? { label: 'Descomprimir', icon: 'unarchive', onSelect: () => uuid && attempt(() => decompressFiles(uuid, directory, file.name), `«${file.name}» descomprimido`) }
            : { label: 'Comprimir en .zip', icon: 'archive', onSelect: () => compress([file.name]) },
        'divider',
        { label: 'Eliminar', icon: 'trash', danger: true, onSelect: () => setDeleting([file.name]) },
    ];

    /* ------------------------------------------------------- arrastrar/soltar */
    const onDrag = (e: DragEvent<HTMLDivElement>, kind: 'enter' | 'leave' | 'over' | 'drop') => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        if (kind === 'enter') dragDepth.current++;
        if (kind === 'leave') dragDepth.current--;
        if (kind === 'drop') {
            dragDepth.current = 0;
            startUploads(e.dataTransfer.files);
        }
        setDragging(dragDepth.current > 0 && kind !== 'drop');
    };

    const allSelected = !!visible.length && visible.every((f) => selected.includes(f.name));
    const SortButton = ({ k, label, desktopOnly }: { k: SortKey; label: string; desktopOnly?: boolean }) => (
        <button
            onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (-s.dir as 1 | -1) : 1 }))}
            className={cx('items-center gap-1 transition hover:text-white', desktopOnly ? 'hidden justify-end md:inline-flex' : 'inline-flex', sort.key === k && 'text-slate-200')}
        >
            {label}
            {sort.key === k && <Icon name={sort.dir === 1 ? 'chevron-down' : 'chevron-up'} className='h-3 w-3' />}
        </button>
    );

    return (
        <div
            className='relative'
            onDragEnter={(e) => onDrag(e, 'enter')}
            onDragLeave={(e) => onDrag(e, 'leave')}
            onDragOver={(e) => onDrag(e, 'over')}
            onDrop={(e) => onDrag(e, 'drop')}
        >
            <section className='glass overflow-hidden rounded-3xl'>
                {/* Barra de herramientas */}
                <div className='flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between'>
                    <FileManagerBreadcrumbs directory={directory} onNavigate={onNavigate} />
                    <div className='flex flex-wrap items-center gap-2'>
                        <div className='relative min-w-0 flex-1 sm:w-56 sm:flex-none'>
                            <Icon name='search' className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500' />
                            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Filtrar…' className='py-2 pl-9 text-[13px]' aria-label='Filtrar archivos' />
                        </div>
                        <Button size='sm' icon='folder-plus' onClick={() => setNaming({ mode: 'folder' })}>
                            <span className='hidden sm:inline'>Nueva carpeta</span>
                        </Button>
                        <Button size='sm' icon='file-plus' onClick={() => setNaming({ mode: 'file' })}>
                            <span className='hidden sm:inline'>Nuevo archivo</span>
                        </Button>
                        <Button size='sm' variant='primary' icon='upload' onClick={() => picker.current?.click()}>
                            Subir
                        </Button>
                        <input
                            ref={picker}
                            type='file'
                            multiple
                            hidden
                            onChange={(e) => {
                                if (e.target.files) startUploads(e.target.files);
                                e.target.value = '';
                            }}
                        />
                    </div>
                </div>

                {/* Subidas en curso */}
                {uploads.length > 0 && (
                    <div className='space-y-2 border-b border-white/10 bg-violet-500/[0.06] px-4 py-3'>
                        {uploads.map((u) => (
                            <div key={u.id} className='flex items-center gap-3 text-xs'>
                                <Spinner size='h-3.5 w-3.5' className='text-violet-300' />
                                <span className='w-40 truncate text-slate-200 sm:w-64'>{u.name}</span>
                                <div className='meter h-1.5 flex-1'>
                                    <div className='meter-fill' style={{ width: `${u.progress}%` }} />
                                </div>
                                <span className='w-10 text-right font-mono text-slate-400'>{u.progress}%</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Cabecera de la tabla */}
                <div className={cx('grid items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-500', GRID)}>
                    <label className='grid h-5 w-5 place-items-center'>
                        <input
                            type='checkbox'
                            className='peer sr-only'
                            checked={allSelected}
                            onChange={() => setSelected(allSelected ? [] : visible.map((f) => f.name))}
                            aria-label='Seleccionar todo'
                        />
                        <span className='grid h-4.5 w-4.5 place-items-center rounded-md border border-white/20 bg-white/[0.04] text-transparent transition peer-checked:border-fuchsia-300/60 peer-checked:bg-linear-to-br peer-checked:from-violet-500 peer-checked:to-fuchsia-500 peer-checked:text-white'>
                            <Icon name='check' className='h-3 w-3' strokeWidth={3} />
                        </span>
                    </label>
                    <SortButton k='name' label='Nombre' />
                    <SortButton k='size' label='Tamaño' desktopOnly />
                    <SortButton k='modifiedAt' label='Modificado' desktopOnly />
                    <span className='w-8' />
                </div>

                {/* Filas */}
                <div className='min-h-[18rem]'>
                    {files === null ? (
                        <div className='space-y-2 p-4'>
                            {Array.from({ length: 7 }, (_, i) => (
                                <div key={i} className='h-11 animate-pulse rounded-xl bg-white/[0.04]' style={{ animationDelay: `${i * 80}ms` }} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className='flex flex-col items-center gap-3 px-4 py-16 text-center'>
                            <Icon name='alert' className='h-8 w-8 text-rose-300' />
                            <p className='text-sm text-slate-300'>{error}</p>
                            <Button size='sm' icon='home' onClick={() => onNavigate('/')}>
                                Volver a la raíz
                            </Button>
                        </div>
                    ) : visible.length ? (
                        <>
                            {directory !== '/' && !query && (
                                <button onClick={() => onNavigate(directory.split('/').slice(0, -1).join('/') || '/')} className={cx('file-row w-full text-left text-slate-400', GRID)}>
                                    <span className='w-5' />
                                    <span className='flex items-center gap-3'>
                                        <span className='icon-tile h-9 w-9 from-white/10 to-white/0 text-slate-400 ring-white/10'>
                                            <Icon name='arrow-up' className='h-4 w-4' />
                                        </span>
                                        <span className='font-mono text-[13px]'>..</span>
                                    </span>
                                </button>
                            )}
                            {visible.map((file) => (
                                <FileObjectRow key={file.key} file={file} selected={selected.includes(file.name)} onToggle={toggle} onOpen={open} onMenu={openMenu} />
                            ))}
                        </>
                    ) : (
                        <div className='flex flex-col items-center gap-2 px-4 py-16 text-center'>
                            <span className='grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05] text-slate-500 ring-1 ring-white/10'>
                                <Icon name={query ? 'search' : 'folder'} className='h-6 w-6' />
                            </span>
                            <p className='text-sm text-slate-300'>{query ? `Nada coincide con «${query}»` : 'Esta carpeta está vacía'}</p>
                            <p className='text-xs text-slate-500'>Arrastra archivos aquí para subirlos.</p>
                        </div>
                    )}
                </div>

                <div className='flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3 text-[11px] text-slate-500'>
                    <span>
                        {totals.dirs} carpetas · {totals.files} archivos · <span className='font-mono text-slate-400'>{bytesToString(totals.bytes)}</span>
                    </span>
                    <span className='hidden sm:inline'>Clic derecho en una fila para ver sus acciones · arrastra archivos para subirlos</span>
                </div>
            </section>

            {/* Zona de soltar */}
            {dragging && (
                <div className='pointer-events-none absolute inset-0 z-20 grid animate-fade-in place-items-center rounded-3xl border-2 border-dashed border-fuchsia-300/60 bg-violet-950/60 backdrop-blur-md'>
                    <div className='text-center'>
                        <Icon name='upload' className='mx-auto h-10 w-10 text-fuchsia-200' />
                        <p className='mt-3 font-display text-lg font-semibold text-white'>Suelta para subir</p>
                        <p className='font-mono text-xs text-slate-300'>/home/container{directory === '/' ? '' : directory}</p>
                    </div>
                </div>
            )}

            <FloatingMenu
                anchor={menu?.anchor ?? null}
                onClose={() => setMenu(null)}
                items={menu ? menuItems(menu.file) : []}
                header={
                    menu && (
                        <div className='min-w-0'>
                            <p className='truncate font-mono text-xs text-white'>{menu.file.name}</p>
                            <p className='font-mono text-[10px] text-slate-500'>
                                {menu.file.mode} · {menu.file.isFile ? bytesToString(menu.file.size) : 'carpeta'}
                            </p>
                        </div>
                    )
                }
            />

            <MassActionsBar count={selected.length} busy={busy} onCompress={() => compress(selected)} onDelete={() => setDeleting(selected)} onClear={() => setSelected([])} />

            <FileNameModal
                mode={naming?.mode ?? null}
                initial={naming?.file?.name ?? ''}
                directory={directory}
                taken={(files ?? []).map((f) => f.name)}
                onClose={() => setNaming(null)}
                onSubmit={async (name) => {
                    if (!uuid || !naming) return;
                    if (naming.mode === 'folder') {
                        await createDirectory(uuid, directory, name);
                        toast({ title: `Carpeta «${name}» creada`, tone: 'success', icon: 'folder-plus' });
                    } else if (naming.mode === 'rename' && naming.file) {
                        await renameFiles(uuid, directory, [{ from: naming.file.name, to: name }]);
                        toast({ title: `Renombrado a «${name}»`, tone: 'success' });
                    } else {
                        setEditing({ path: join(directory, name), isNew: true });
                    }
                    reload();
                }}
            />

            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={() => deleting && remove(deleting)}
                loading={busy}
                title={deleting?.length === 1 ? `¿Eliminar «${deleting[0]}»?` : `¿Eliminar ${deleting?.length ?? 0} elementos?`}
                confirm='Eliminar'
                icon='trash'
            >
                Los archivos eliminados no se pueden recuperar salvo desde una copia de seguridad.
            </ConfirmDialog>

            {uuid && <FileEditorModal uuid={uuid} path={editing?.path ?? null} isNew={editing?.isNew} onClose={() => setEditing(null)} onSaved={reload} />}
        </div>
    );
}
