import { createRoot } from 'react-dom/client';
import App from '@/App';
import '@/styles/glassy.css';

// Vista previa independiente. En el panel, el árbol lo monta resources/scripts/index.tsx.
createRoot(document.getElementById('app')!).render(<App />);
