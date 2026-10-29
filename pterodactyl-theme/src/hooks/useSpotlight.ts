import { useEffect } from 'react';

/** Fija --mx/--my en la tarjeta .spotlight bajo el cursor (un solo listener global). */
export default function useSpotlight() {
    useEffect(() => {
        const onMove = (e: PointerEvent) => {
            const card = (e.target as Element | null)?.closest?.<HTMLElement>('.spotlight');
            if (!card) return;
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - r.left}px`);
            card.style.setProperty('--my', `${e.clientY - r.top}px`);
        };
        document.addEventListener('pointermove', onMove, { passive: true });
        return () => document.removeEventListener('pointermove', onMove);
    }, []);
}
