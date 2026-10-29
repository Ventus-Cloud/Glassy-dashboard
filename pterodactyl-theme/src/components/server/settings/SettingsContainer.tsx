import BackupsBox from '@/components/server/settings/BackupsBox';
import NetworkBox from '@/components/server/settings/NetworkBox';
import ReinstallServerBox from '@/components/server/settings/ReinstallServerBox';
import RenameServerBox from '@/components/server/settings/RenameServerBox';
import SftpDetailsBox from '@/components/server/settings/SftpDetailsBox';
import { ServerContext } from '@/state/server';

/** Pestaña «Ajustes y red». */
export default function SettingsContainer({ onOpenConsole }: { onOpenConsole: () => void }) {
    const ready = ServerContext.useStoreState((state) => !!state.server.data);

    if (!ready) return <div className='glass h-72 animate-pulse rounded-3xl' />;

    return (
        <div className='grid gap-4 lg:grid-cols-2 lg:gap-5'>
            <RenameServerBox />
            <SftpDetailsBox />
            <div id='network' className='scroll-mt-40 lg:col-span-2'>
                <NetworkBox />
            </div>
            <BackupsBox />
            <ReinstallServerBox onReinstalled={onOpenConsole} />
        </div>
    );
}
