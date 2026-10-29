import { useEffect, useMemo, useState } from 'react';
import type { StartupData } from '@/api/types';
import { getServerStartup, setSelectedDockerImage, updateStartupVariable } from '@/api/server';
import Button from '@/components/elements/Button';
import CopyButton from '@/components/elements/CopyButton';
import GlassBox from '@/components/elements/GlassBox';
import Icon from '@/components/elements/Icon';
import { useToast } from '@/components/elements/Toast';
import DockerImageSelect from '@/components/server/startup/DockerImageSelect';
import VariableBox from '@/components/server/startup/VariableBox';
import { ServerContext } from '@/state/server';
import { cx } from '@/lib/format';

/** Java mínimo para la versión de Minecraft indicada. */
function requiredJava(mc: string): number {
    const [, minor = 0, patch = 0] = (mc === 'latest' ? '1.21.1' : mc).split('.').map(Number);
    if (minor > 20 || (minor === 20 && patch >= 5)) return 21;
    if (minor >= 18) return 17;
    return minor === 17 ? 16 : 8;
}

/** Pestaña «Inicio»: comando de arranque, imagen Docker y variables del egg. */
export default function StartupContainer({ onOpenNetwork }: { onOpenNetwork: () => void }) {
    const server = ServerContext.useStoreState((state) => state.server.data);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const actions = ServerContext.useStoreActions();
    const toast = useToast();

    const [data, setData] = useState<StartupData | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [image, setImage] = useState('');
    const [saving, setSaving] = useState(false);
    const [showTemplate, setShowTemplate] = useState(false);

    const uuid = server?.uuid;
    useEffect(() => {
        if (!uuid) return;
        getServerStartup(uuid).then((startup) => {
            setData(startup);
            setValues(Object.fromEntries(startup.variables.map((v) => [v.envVariable, v.serverValue ?? v.defaultValue])));
        });
    }, [uuid]);

    useEffect(() => {
        if (server) setImage(server.dockerImage);
    }, [server?.dockerImage]); // eslint-disable-line react-hooks/exhaustive-deps

    const changed = useMemo(() => (data?.variables ?? []).filter((v) => v.isEditable && values[v.envVariable] !== (v.serverValue ?? v.defaultValue)), [data, values]);
    const imageChanged = !!server && image !== server.dockerImage;
    const pending = changed.length + (imageChanged ? 1 : 0);

    const primary = server?.allocations.find((a) => a.isDefault);
    const env: Record<string, string> = { SERVER_MEMORY: String(server?.limits.memory ?? ''), SERVER_IP: '0.0.0.0', SERVER_PORT: String(primary?.port ?? '') };

    // Vista previa en vivo del comando con los valores aún sin guardar.
    const tokens = useMemo(() => {
        if (!data) return [];
        return data.rawInvocation.split(/({{\s*[A-Z0-9_]+\s*}})/).map((part) => {
            const m = /^{{\s*([A-Z0-9_]+)\s*}}$/.exec(part);
            return m ? { env: m[1], text: values[m[1]] ?? env[m[1]] ?? '' } : { env: null, text: part };
        });
    }, [data, values, env.SERVER_PORT]); // eslint-disable-line react-hooks/exhaustive-deps
    const resolved = tokens.map((t) => t.text).join('').replace(/\s+/g, ' ').trim();

    const java = Number(/java_(\d+)/.exec(image)?.[1] ?? 0);
    const needed = requiredJava(values.MINECRAFT_VERSION ?? '1.21.1');

    const discard = () => {
        if (!data || !server) return;
        setValues(Object.fromEntries(data.variables.map((v) => [v.envVariable, v.serverValue ?? v.defaultValue])));
        setImage(server.dockerImage);
        setErrors({});
    };

    const save = async () => {
        if (!uuid || !data) return;
        setSaving(true);
        const nextErrors: Record<string, string> = {};
        let variables = data.variables;
        let invocation = server!.invocation;
        for (const v of changed) {
            try {
                const [updated, command] = await updateStartupVariable(uuid, v.envVariable, values[v.envVariable]);
                variables = variables.map((x) => (x.envVariable === updated.envVariable ? updated : x));
                invocation = command;
            } catch (e) {
                nextErrors[v.envVariable] = (e as Error).message;
            }
        }
        if (imageChanged) {
            try {
                await setSelectedDockerImage(uuid, image);
                actions.updateServer((s) => ({ ...s, dockerImage: image }));
            } catch (e) {
                toast({ title: 'No se pudo cambiar la imagen', description: (e as Error).message, tone: 'error' });
            }
        }
        setData({ ...data, variables });
        actions.updateServer((s) => ({ ...s, variables, invocation }));
        setErrors(nextErrors);
        setSaving(false);
        const failed = Object.keys(nextErrors).length;
        toast(
            failed
                ? { title: `${failed} ${failed === 1 ? 'variable no se guardó' : 'variables no se guardaron'}`, description: 'Revisa los campos marcados.', tone: 'error' }
                : { title: 'Configuración de inicio guardada', description: status === 'offline' ? 'Se aplicará en el próximo arranque.' : 'Reinicia el servidor para aplicar los cambios.', tone: 'success', icon: 'save' },
        );
    };

    if (!server || !data) {
        return (
            <div className='grid gap-5 lg:grid-cols-3'>
                <div className='glass h-56 animate-pulse rounded-3xl lg:col-span-2' />
                <div className='glass h-56 animate-pulse rounded-3xl' />
            </div>
        );
    }

    return (
        <div className='space-y-5 pb-20'>
            <div className='grid gap-4 lg:grid-cols-3 lg:gap-5'>
                <GlassBox
                    className='lg:col-span-2'
                    icon='terminal'
                    title='Comando de inicio'
                    description='Lo ejecuta Wings dentro del contenedor. Se actualiza mientras editas las variables.'
                    actions={
                        <button onClick={() => setShowTemplate((v) => !v)} className='rounded-lg px-2 py-1 text-xs font-medium text-violet-300 transition hover:bg-white/10 hover:text-violet-200'>
                            {showTemplate ? 'Ver resultado' : 'Ver plantilla'}
                        </button>
                    }
                >
                    <div className='scanlines relative overflow-hidden rounded-2xl border border-white/10 bg-[#05030f]/70 p-4 font-mono text-[12.5px] leading-relaxed'>
                        <span className='select-none text-fuchsia-400'>$ </span>
                        {showTemplate ? (
                            <span className='break-all text-slate-300'>
                                {data.rawInvocation.split(/({{\s*[A-Z0-9_]+\s*}})/).map((part, i) => (
                                    <span key={i} className={/^{{/.test(part) ? 'text-amber-300' : undefined}>
                                        {part}
                                    </span>
                                ))}
                            </span>
                        ) : (
                            <span className='break-all text-slate-200'>
                                {tokens.map((t, i) =>
                                    t.env ? (
                                        <span key={i} title={t.env} className={cx('rounded px-0.5', changed.some((v) => v.envVariable === t.env) ? 'bg-fuchsia-500/25 text-fuchsia-100' : 'bg-violet-500/15 text-violet-200')}>
                                            {t.text || '∅'}
                                        </span>
                                    ) : (
                                        <span key={i}>{t.text}</span>
                                    ),
                                )}
                            </span>
                        )}
                    </div>
                    <div className='mt-4 grid gap-2.5 sm:grid-cols-3'>
                        {Object.entries(env).map(([key, value]) => (
                            <div key={key} className='rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5'>
                                <div className='flex items-center justify-between gap-2'>
                                    <p className='font-mono text-[11px] text-violet-200'>{key}</p>
                                    {key === 'SERVER_PORT' && (
                                        <button onClick={onOpenNetwork} className='inline-flex items-center gap-0.5 text-[11px] font-medium text-fuchsia-300 transition hover:text-fuchsia-200'>
                                            Cambiar
                                            <Icon name='chevron-right' className='h-3 w-3' />
                                        </button>
                                    )}
                                </div>
                                <p className='mt-0.5 font-mono text-sm text-white'>{value}</p>
                            </div>
                        ))}
                    </div>
                    <div className='mt-3 flex flex-wrap items-center gap-2'>
                        <CopyButton text={resolved} label='Copiar comando' mono={false} />
                        <span className='chip'>
                            <Icon name='layers' className='h-3.5 w-3.5 text-fuchsia-300' />
                            Egg {server.egg.name} · {server.egg.nest}
                        </span>
                    </div>
                </GlassBox>

                <GlassBox icon='coffee' title='Imagen Docker' description='Versión de Java del contenedor.' tone='from-orange-400/35 to-rose-500/10 text-orange-200 ring-orange-300/30'>
                    <DockerImageSelect images={data.dockerImages} value={image} onChange={setImage} disabled={saving} />
                    {java > 0 && java < needed ? (
                        <p className='mt-3 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100'>
                            <Icon name='alert' className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                            Minecraft {values.MINECRAFT_VERSION} necesita Java {needed}. Con Java {java} el servidor no arrancará.
                        </p>
                    ) : (
                        <p className='mt-3 flex items-center gap-2 text-xs text-emerald-300'>
                            <Icon name='check' className='h-3.5 w-3.5' />
                            Compatible con Minecraft {values.MINECRAFT_VERSION}
                        </p>
                    )}
                </GlassBox>
            </div>

            <div>
                <div className='mb-3 flex items-end justify-between gap-3'>
                    <div>
                        <h2 className='font-display text-lg font-semibold text-white'>Variables del egg</h2>
                        <p className='text-xs text-slate-400'>Los campos con candado solo los puede cambiar un administrador.</p>
                    </div>
                </div>
                <div className='grid gap-4 md:grid-cols-2 lg:gap-5 xl:grid-cols-3'>
                    {data.variables.map((v) => (
                        <VariableBox
                            key={v.envVariable}
                            variable={v}
                            value={values[v.envVariable] ?? ''}
                            error={errors[v.envVariable]}
                            onChange={(value) => {
                                setValues((s) => ({ ...s, [v.envVariable]: value }));
                                if (errors[v.envVariable]) setErrors(({ [v.envVariable]: _, ...rest }) => rest);
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Barra de guardado flotante */}
            <div className={cx('pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-3 transition-all duration-300', pending ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0')}>
                <div className='glass-pop pointer-events-auto flex items-center gap-3 rounded-2xl p-2 pl-4'>
                    <span className='flex items-center gap-2 text-sm text-slate-200'>
                        <span className='h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,.9)]' />
                        {pending} {pending === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}
                    </span>
                    <Button size='sm' variant='ghost' onClick={discard} disabled={saving || !pending}>
                        Descartar
                    </Button>
                    <Button size='sm' variant='primary' icon='save' onClick={save} loading={saving} disabled={!pending}>
                        Guardar cambios
                    </Button>
                </div>
            </div>
        </div>
    );
}
