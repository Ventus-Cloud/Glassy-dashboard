/**
 * Paleta para xterm.js por si prefieres conservar la consola original del
 * panel (components/server/console/Console.tsx) en lugar de la del tema:
 *
 *   const terminal = new Terminal({ ...terminalProps, theme: glassyTerminalTheme, allowTransparency: true });
 *
 * y añade `className="glass-strong rounded-3xl"` al contenedor.
 */
export const glassyTerminalTheme = {
    background: 'rgba(5, 3, 15, 0)',
    foreground: '#cbd5e1',
    cursor: '#e879f9',
    cursorAccent: '#05030f',
    selectionBackground: 'rgba(167, 139, 250, 0.35)',
    black: '#0b0720',
    red: '#fb7185',
    green: '#34d399',
    yellow: '#fcd34d',
    blue: '#38bdf8',
    magenta: '#e879f9',
    cyan: '#22d3ee',
    white: '#e2e8f0',
    brightBlack: '#64748b',
    brightRed: '#fda4af',
    brightGreen: '#6ee7b7',
    brightYellow: '#fde68a',
    brightBlue: '#7dd3fc',
    brightMagenta: '#f0abfc',
    brightCyan: '#67e8f9',
    brightWhite: '#ffffff',
};
