import { useEffect, useState } from 'react';
import Button from '@/components/elements/Button';
import { Field, Input } from '@/components/elements/Field';
import Modal from '@/components/elements/Modal';
import type { IconName } from '@/components/elements/Icon';

export type NameMode = 'folder' | 'file' | 'rename';

const COPY: Record<NameMode, { title: string; label: string; confirm: string; icon: IconName }> = {
    folder: { title: 'Nueva carpeta', label: 'Nombre de la carpeta', confirm: 'Crear carpeta', icon: 'folder-plus' },
    file: { title: 'Nuevo archivo', label: 'Nombre del archivo', confirm: 'Crear y editar', icon: 'file-plus' },
    rename: { title: 'Renombrar', label: 'Nuevo nombre', confirm: 'Renombrar', icon: 'pencil' },
};

interface Props {
    mode: NameMode | null;
    initial?: string;
    directory: string;
    taken: string[];
    onClose: () => void;
    onSubmit: (name: string) => Promise<void>;
}

/** Igual que FileNameModal / RenameFileModal del panel. */
export default function FileNameModal({ mode, initial = '', directory, taken, onClose, onSubmit }: Props) {
    const [value, setValue] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (mode) {
            setValue(initial);
            setError(null);
        }
    }, [mode, initial]);

    const copy = COPY[mode ?? 'folder'];
    const validate = (name: string) => {
        if (!name.trim()) return 'Escribe un nombre.';
        if (/[/\\]/.test(name)) return 'El nombre no puede contener barras.';
        if (name !== initial && taken.includes(name)) return 'Ya existe un elemento con ese nombre.';
        return null;
    };

    const submit = async () => {
        const problem = validate(value);
        setError(problem);
        if (problem) return;
        setBusy(true);
        try {
            await onSubmit(value.trim());
            onClose();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={!!mode}
            onClose={onClose}
            title={copy.title}
            description={<span className='font-mono'>/home/container{directory === '/' ? '' : directory}</span>}
            icon={copy.icon}
            locked={busy}
            footer={
                <>
                    <Button variant='ghost' onClick={onClose} disabled={busy}>
                        Cancelar
                    </Button>
                    <Button variant='primary' onClick={submit} loading={busy}>
                        {copy.confirm}
                    </Button>
                </>
            }
        >
            <Field id='file-name' label={copy.label} error={error}>
                <Input
                    id='file-name'
                    value={value}
                    aria-invalid={!!error}
                    onChange={(e) => {
                        setValue(e.target.value);
                        if (error) setError(validate(e.target.value));
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    onFocus={(e) => {
                        const dot = e.target.value.lastIndexOf('.');
                        e.target.setSelectionRange(0, dot > 0 && mode !== 'folder' ? dot : e.target.value.length);
                    }}
                    className='font-mono'
                    placeholder={mode === 'folder' ? 'plugins' : 'config.yml'}
                />
            </Field>
        </Modal>
    );
}
