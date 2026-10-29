import { useEffect, useState } from 'react';
import { renameServer } from '@/api/server';
import Button from '@/components/elements/Button';
import { Field, Input, Textarea } from '@/components/elements/Field';
import GlassBox from '@/components/elements/GlassBox';
import { useToast } from '@/components/elements/Toast';
import { ServerContext } from '@/state/server';

/** Nombre y descripción del servidor (RenameServerBox del panel). */
export default function RenameServerBox() {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const actions = ServerContext.useStoreActions();
    const toast = useToast();
    const [name, setName] = useState(server.name);
    const [description, setDescription] = useState(server.description);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setName(server.name);
        setDescription(server.description);
    }, [server.name, server.description]);

    const dirty = name !== server.name || description !== server.description;

    const submit = async () => {
        setSaving(true);
        setError(null);
        try {
            await renameServer(server.uuid, name, description);
            actions.updateServer((s) => ({ ...s, name: name.trim(), description: description.trim() }));
            toast({ title: 'Servidor actualizado', description: name.trim(), tone: 'success' });
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <GlassBox icon='pencil' title='Identidad del servidor' description='Así aparece en tu lista de servidores.' hover>
            <form
                className='space-y-4'
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                <Field id='server-name-input' label='Nombre' error={error} hint={`${name.length}/191 caracteres`}>
                    <Input id='server-name-input' value={name} maxLength={191} aria-invalid={!!error} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field id='server-description' label='Descripción'>
                    <Textarea id='server-description' rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder='Opcional' />
                </Field>
                <div className='flex justify-end gap-2'>
                    <Button
                        variant='ghost'
                        disabled={!dirty || saving}
                        onClick={() => {
                            setName(server.name);
                            setDescription(server.description);
                        }}
                    >
                        Deshacer
                    </Button>
                    <Button type='submit' variant='primary' icon='save' loading={saving} disabled={!dirty}>
                        Guardar
                    </Button>
                </div>
            </form>
        </GlassBox>
    );
}
