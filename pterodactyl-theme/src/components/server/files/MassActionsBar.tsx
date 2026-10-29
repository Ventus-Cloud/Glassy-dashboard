import Button from '@/components/elements/Button';

interface Props {
    count: number;
    busy: boolean;
    onCompress: () => void;
    onDelete: () => void;
    onClear: () => void;
}

/** Barra flotante para acciones sobre la selección (como MassActionsBar del panel). */
export default function MassActionsBar({ count, busy, onCompress, onDelete, onClear }: Props) {
    if (!count) return null;
    return (
        <div className='pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-3'>
            <div className='glass-pop pointer-events-auto flex animate-pop-in items-center gap-2 rounded-2xl p-2 pl-4'>
                <span className='mr-1 whitespace-nowrap text-sm text-slate-200'>
                    <span className='font-semibold text-white'>{count}</span> {count === 1 ? 'seleccionado' : 'seleccionados'}
                </span>
                <Button size='sm' icon='archive' onClick={onCompress} loading={busy}>
                    <span className='hidden sm:inline'>Comprimir en .zip</span>
                    <span className='sm:hidden'>Zip</span>
                </Button>
                <Button size='sm' variant='danger' icon='trash' onClick={onDelete} disabled={busy}>
                    Eliminar
                </Button>
                <Button size='sm' variant='ghost' iconOnly icon='x' onClick={onClear} aria-label='Quitar selección' />
            </div>
        </div>
    );
}
