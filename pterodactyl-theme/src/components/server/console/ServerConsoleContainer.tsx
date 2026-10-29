import Console from '@/components/server/console/Console';
import PlayerList from '@/components/server/console/PlayerList';
import StatBlocks from '@/components/server/console/StatBlocks';

/** Pestaña «Consola»: métricas, terminal y jugadores. */
export default function ServerConsoleContainer() {
    return (
        <div className='space-y-4 lg:space-y-5'>
            <StatBlocks />
            <div className='grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]'>
                <Console />
                <PlayerList />
            </div>
        </div>
    );
}
