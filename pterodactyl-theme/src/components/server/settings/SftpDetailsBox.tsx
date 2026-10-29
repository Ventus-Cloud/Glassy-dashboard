import CopyButton from '@/components/elements/CopyButton';
import GlassBox from '@/components/elements/GlassBox';
import Icon from '@/components/elements/Icon';
import { ServerContext } from '@/state/server';

/** Datos de conexión SFTP y de depuración (como en SettingsContainer). */
export default function SftpDetailsBox() {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const address = `sftp://${server.sftpDetails.ip}:${server.sftpDetails.port}`;

    return (
        <GlassBox icon='key' title='Acceso SFTP' description='Usa la misma contraseña que en el panel.' tone='from-cyan-400/35 to-sky-500/10 text-cyan-200 ring-cyan-300/30' hover>
            <dl className='space-y-3 text-sm'>
                <div>
                    <dt className='field-label'>Dirección del servidor</dt>
                    <dd>
                        <CopyButton text={address} className='w-full justify-between py-2' />
                    </dd>
                </div>
                <div>
                    <dt className='field-label'>Usuario</dt>
                    <dd>
                        <CopyButton text={server.sftpUsername} className='w-full justify-between py-2' />
                    </dd>
                </div>
            </dl>
            <a href={`sftp://${server.sftpUsername}@${server.sftpDetails.ip}:${server.sftpDetails.port}`} className='btn btn-secondary mt-4 w-full'>
                <Icon name='external-link' className='h-4 w-4' />
                Abrir en mi cliente SFTP
            </a>
            <div className='mt-5 border-t border-white/10 pt-4'>
                <p className='mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Información de depuración</p>
                <dl className='space-y-1.5 font-mono text-xs'>
                    <div className='flex justify-between gap-3'>
                        <dt className='text-slate-400'>Nodo</dt>
                        <dd className='text-slate-200'>{server.node}</dd>
                    </div>
                    <div className='flex justify-between gap-3'>
                        <dt className='text-slate-400'>ID del servidor</dt>
                        <dd className='truncate text-slate-200' title={server.uuid}>
                            {server.uuid}
                        </dd>
                    </div>
                </dl>
            </div>
        </GlassBox>
    );
}
