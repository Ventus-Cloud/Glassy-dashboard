# Glassy Panel

Interfaces para gestionar servidores de videojuegos, inspiradas en [Pterodactyl](https://pterodactyl.io) y con estética **glassmorphism**.

El repositorio tiene dos versiones:

| Carpeta | Qué es |
|---|---|
| `index.html` | **Dashboard del nodo**: wireframe en un único archivo (HTML + Tailwind CSS v4 por CDN + JavaScript sin dependencias). Se describe en este README. |
| [`pterodactyl-theme/`](pterodactyl-theme/) | **Tema para Pterodactyl**: vista de un servidor con pestañas (Consola, Archivos, Inicio, Ajustes y red), escrita en React + TypeScript + Tailwind CSS v4 con la estructura de `resources/scripts` del panel. Tiene su propio README con la guía de integración. |

En las dos versiones los datos son simulados en el navegador.

## Cómo verlo

Abre `index.html` en el navegador. Necesita conexión a internet para cargar Tailwind (Play CDN de jsDelivr) y las tipografías de Google Fonts.

Si prefieres servirlo en local:

```bash
npx serve .
# o
python3 -m http.server 8080
```

## Qué incluye

**Estética**
- Fondo con degradado morado/índigo, orbes de luz animados, rejilla sutil y grano.
- Paneles de cristal: fondo semitransparente, `backdrop-blur-xl`, bordes `white/10–20`, destello en el borde superior y sombras profundas.
- Al pasar el cursor, las tarjetas se elevan, se iluminan y muestran un foco de luz que sigue al ratón.

**Estructura**
- **Sidebar**: grupos desplegables (Servidores, Base de datos, Red, Configuración) y modo contraído a solo iconos (se recuerda entre visitas). En móvil se abre como cajón. Incluye un widget con los recursos del nodo y el estado del usuario (En línea / Ausente / No molestar / Invisible).
- **Header**: nombre del nodo con latencia en vivo, buscador rápido (`Ctrl/⌘ + K` o `/`, navegable con flechas) y panel de notificaciones.
- **Cabecera del servidor**: estado, IP copiable, jugadores, uptime y botones **Iniciar / Reiniciar / Apagar** con brillo al pasar el cursor. Mientras el servidor se detiene, «Apagar» pasa a **Forzar** (kill), como en Pterodactyl.
- **Métricas en tiempo real**: CPU (barra y carga por hilo), RAM (gráfico de área), almacenamiento SSD (anillo y desglose) y red (entrada/salida).
- **Consola interactiva**: logs de arranque realistas (Minecraft/Paper, Rust/Oxide, Valheim y CS2), eventos en vivo, historial con ↑/↓, autocompletado con `Tab`, modo ampliado y estadísticas del juego (TPS, MSPT…). Escribe `help` para ver los comandos.
- **Servidores del nodo**: tarjetas con estado y uso de recursos. Al pulsar una, se carga en el panel principal. Se pueden filtrar por activos o apagados.

**Responsive y accesibilidad**: se adapta desde 360 px hasta pantallas grandes, funciona con teclado, tiene etiquetas ARIA y respeta `prefers-reduced-motion`.

## Para producción

El Play CDN de Tailwind está pensado para prototipos. Para producción, compila el CSS con la CLI de Tailwind v4: pasa el contenido de `<style type="text/tailwindcss">` a un `input.css` (precedido de `@import "tailwindcss";`) y enlaza el CSS generado en lugar del script del CDN.
