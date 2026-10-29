import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@/components/elements/Button';
import Icon from '@/components/elements/Icon';
import Modal from '@/components/elements/Modal';
import Spinner from '@/components/elements/Spinner';
import { useToast } from '@/components/elements/Toast';
import { getFileContents, saveFileContents } from '@/api/server';
import { languageOf } from '@/components/server/files/fileIcon';
import { bytesToString, cx } from '@/lib/format';

interface Props {
    uuid: string;
    /** Ruta completa del archivo, o null para cerrar. */
    path: string | null;
    isNew?: boolean;
    onClose: () => void;
    onSaved: () => void;
}

/**
 * Editor en modal. En el panel, FileEditContainer usa CodeMirror en su propia
 * ruta (/files/edit); este editor ligero sirve para la vista previa y para
 * ediciones rápidas sin salir del listado.
 */
export default function FileEditorModal({ uuid, path, isNew, onClose, onSaved }: Props) {
    const toast = useToast();
    const [content, setContent] = useState('');
    const [original, setOriginal] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [wrap, setWrap] = useState(false);
    const gutter = useRef<HTMLDivElement>(null);
    const name = path?.split('/').pop() ?? '';
    const dirty = content !== original;

    useEffect(() => {
        if (!path) return;
        if (isNew) {
            setContent('');
            setOriginal('');
            return;
        }
        setLoading(true);
        getFileContents(uuid, path)
            .then((text) => {
                setContent(text);
                setOriginal(text);
            })
            .catch((e: Error) => toast({ title: 'No se pudo abrir el archivo', description: e.message, tone: 'error' }))
            .finally(() => setLoading(false));
    }, [uuid, path, isNew, toast]);

    const save = useCallback(async () => {
        if (!path) return;
        setSaving(true);
        try {
            await saveFileContents(uuid, path, content);
            setOriginal(content);
            toast({ title: `${name} guardado`, description: name === 'eula.txt' || name === 'server.properties' ? 'Reinicia el servidor para aplicar los cambios.' : undefined, tone: 'success', icon: 'save' });
            onSaved();
        } catch (e) {
            toast({ title: 'No se pudo guardar', description: (e as Error).message, tone: 'error' });
        } finally {
            setSaving(false);
        }
    }, [uuid, path, content, name, toast, onSaved]);

    const close = () => {
        if (dirty && !window.confirm('Hay cambios sin guardar. ¿Cerrar de todos modos?')) return;
        onClose();
    };

    const lines = content.split('\n').length;
    const eulaPending = name === 'eula.txt' && /eula\s*=\s*false/i.test(content);

    return (
        <Modal
            open={!!path}
            onClose={close}
            size='xl'
            icon='file-code'
            tone='from-cyan-400/30 to-sky-500/10 text-cyan-200 ring-cyan-300/25'
            title={
                <span className='flex items-center gap-2'>
                    <span className='truncate font-mono text-base'>{name}</span>
                    {dirty && <span className='h-2 w-2 shrink-0 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,.9)]' title='Cambios sin guardar' />}
                </span>
            }
            description={<span className='font-mono text-xs'>/home/container{path}</span>}
            footer={
                <>
                    <span className='mr-auto hidden items-center gap-3 self-center font-mono text-[11px] text-slate-500 sm:flex'>
                        <span>{languageOf(name)}</span>
                        <span>{lines} líneas</span>
                        <span>{bytesToString(new TextEncoder().encode(content).length)}</span>
                        <span className='kbd'>Ctrl S</span>
                    </span>
                    <Button variant='ghost' onClick={close} disabled={saving}>
                        Cerrar
                    </Button>
                    <Button variant='primary' icon='save' onClick={save} loading={saving} disabled={!dirty && !isNew}>
                        Guardar
                    </Button>
                </>
            }
        >
            {eulaPending && (
                <div className='mb-3 flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-100'>
                    <Icon name='alert' className='mt-0.5 h-4 w-4 shrink-0' />
                    El servidor no arrancará hasta que cambies <code className='font-mono'>eula=false</code> por <code className='font-mono'>eula=true</code>.
                </div>
            )}
            <div className='relative overflow-hidden rounded-2xl border border-white/10 bg-[#05030f]/70'>
                <div className='flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] text-slate-500'>
                    <span className='font-mono'>{languageOf(name)}</span>
                    <label className='flex items-center gap-1.5'>
                        <input type='checkbox' checked={wrap} onChange={(e) => setWrap(e.target.checked)} className='accent-fuchsia-500' />
                        Ajuste de línea
                    </label>
                </div>
                {loading ? (
                    <div className='grid h-[50vh] place-items-center text-slate-400'>
                        <Spinner size='h-6 w-6' />
                    </div>
                ) : (
                    <div className='flex h-[55vh] min-h-64'>
                        <div ref={gutter} className='no-scrollbar select-none overflow-hidden border-r border-white/5 py-3 pl-3 pr-2 text-right font-mono text-[12px] leading-[1.7] text-slate-600' aria-hidden='true'>
                            {Array.from({ length: lines }, (_, i) => (
                                <div key={i}>{i + 1}</div>
                            ))}
                        </div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onScroll={(e) => gutter.current && (gutter.current.scrollTop = e.currentTarget.scrollTop)}
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                                    e.preventDefault();
                                    if (dirty || isNew) save();
                                } else if (e.key === 'Tab') {
                                    e.preventDefault();
                                    const el = e.currentTarget;
                                    const { selectionStart: a, selectionEnd: b } = el;
                                    setContent(content.slice(0, a) + '  ' + content.slice(b));
                                    window.requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
                                }
                            }}
                            spellCheck={false}
                            data-autofocus
                            aria-label={`Contenido de ${name}`}
                            className={cx(
                                'scroll-thin min-w-0 flex-1 resize-none bg-transparent px-3 py-3 font-mono text-[12px] leading-[1.7] text-slate-200 caret-fuchsia-400 focus:outline-none',
                                wrap ? 'whitespace-pre-wrap' : 'whitespace-pre',
                            )}
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
}
