// js/modulos/gestor/cursor.js

/**
 * Módulo para gestionar el color del cursor personalizado.
 */

// --- Variables del Módulo ---
let appState;
let DOM;
let Callbacks;

// --- Plantillas SVG basadas en tus archivos originales ---
// Se reemplazarán los colores del gradiente con marcadores de posición.
const CURSOR_TEMPLATES = {
    default: {
        template: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad-default"><stop offset="0%" stop-color="{c1}"/><stop offset="30%" stop-color="{c2}"/><stop offset="100%" stop-color="{c3}"/></linearGradient>
    <linearGradient id="edge-default"><stop offset="0%" stop-color="{c4}"/><stop offset="100%" stop-color="{c3}"/></linearGradient>
    <filter id="sdw-default" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur"/><feOffset in="blur" dx="8" dy="8" result="offsetBlur"/><feFlood flood-color="#000" flood-opacity="0.4" result="offsetColor"/><feComposite in="offsetColor" in2="offsetBlur" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#sdw-default)">
    <path d="M98.8 390.3c8.9 5.3 19.9 5.5 28.9.6l62.1-33.7 75.7 139.5c5.3 9.8 15.4 15.7 25.8 15.7 4.7 0 9.5-1.1 13.9-3.5l107-58.1c14.2-7.7 19.5-25.5 11.7-39.7l-75.7-139.5 62.1-33.7c9-4.9 14.9-14.3 15.3-24.6.4-10.3-4.7-20.1-13.3-25.7L130.2 4.7c-9-5.8-20.4-6.3-29.8-1.2-9.4 5.1-15.3 15-15.3 25.7l-.5 335.9c0 10.4 5.4 20 14.2 25.2z" fill="url(#grad-default)"/>
    <path d="M98.8 390.3c8.9 5.3 19.9 5.5 28.9.6l62.1-33.7 75.7 139.5c5.3 9.8 15.4 15.7 25.8 15.7 4.7 0 9.5-1.1 13.9-3.5l107-58.1c14.2-7.7 19.5-25.5 11.7-39.7l-75.7-139.5 62.1-33.7c9-4.9 14.9-14.3 15.3-24.6.4-10.3-4.7-20.1-13.3-25.7L130.2 4.7c-9-5.8-20.4-6.3-29.8-1.2-9.4 5.1-15.3 15-15.3 25.7l-.5 335.9c0 10.4 5.4 20 14.2 25.2z" fill="none" stroke="url(#edge-default)" stroke-width="2"/>
  </g>
</svg>`,
        hotspot: '10 2'
    },
    pointer: {
        template: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-150 -150 1222 1222">
  <defs>
    <radialGradient id="grad-pointer"><stop offset="0%" stop-color="{c1}"/><stop offset="70%" stop-color="{c2}"/><stop offset="100%" stop-color="{c3}"/></radialGradient>
    <linearGradient id="edge-pointer"><stop offset="0%" stop-color="{c4}"/><stop offset="100%" stop-color="{c3}"/></linearGradient>
    <filter id="sdw-pointer" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur"/><feOffset in="blur" dx="8" dy="8" result="offsetBlur"/><feFlood flood-color="#000" flood-opacity="0.4" result="offsetColor"/><feComposite in="offsetColor" in2="offsetBlur" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#sdw-pointer)">
    <path d="M811.8 189.5c1.6-11.2 4-27.5-2.9-38.1-17.8-27.5-67.1-16.7-70.2 16.5l-60.3 244.5c-.6 2.3-4 1.9-3.9-.5 1.8-73.8 8.1-339.8 8.1-340-1.2-24.4-21.1-37.1-41.3-37.6-22.5-.6-43.1 14.8-44.6 38.5l-33.5 332.1c-.3 2.4-3.8 2.4-4 0-6.9-83.5-32.8-365.4-33-367.3-1.2-24.4-21.1-37.1-41.3-37.6-21.7-.6-43.2 16-44.6 38.5l-4.1 366.5c0 2.3-3.4 2.7-3.9.5-14.9-60.3-68.4-330.2-68.5-330.4-6.4-28.4-23.9-36.7-44.7-35.9-23.1.8-43.3 17.9-43.2 42.2l53.6 468.8c0 4.9-3.6 9-8.5 9.7h-.1c-15.7-.5-71.4-21.5-107.9-74.2-4.7-6.8-9-13-13-18.7-34.1-48.9-100.2-21.9-90.9 33.7 8.5 51 193.3 306.6 193.3 306.6v.3h406.1l39.7-66.7c14.1-23.8 21.6-50.9 21.6-78.6 0 0 0-147.3-.1-162.9 0-.9.1-1.8.2-2.7C772.6 476.7 804.5 240.4 811.8 189.5z" fill="url(#grad-pointer)"/>
    <path d="M811.8 189.5c1.6-11.2 4-27.5-2.9-38.1-17.8-27.5-67.1-16.7-70.2 16.5l-60.3 244.5c-.6 2.3-4 1.9-3.9-.5 1.8-73.8 8.1-339.8 8.1-340-1.2-24.4-21.1-37.1-41.3-37.6-22.5-.6-43.1 14.8-44.6 38.5l-33.5 332.1c-.3 2.4-3.8 2.4-4 0-6.9-83.5-32.8-365.4-33-367.3-1.2-24.4-21.1-37.1-41.3-37.6-21.7-.6-43.2 16-44.6 38.5l-4.1 366.5c0 2.3-3.4 2.7-3.9.5-14.9-60.3-68.4-330.2-68.5-330.4-6.4-28.4-23.9-36.7-44.7-35.9-23.1.8-43.3 17.9-43.2 42.2l53.6 468.8c0 4.9-3.6 9-8.5 9.7h-.1c-15.7-.5-71.4-21.5-107.9-74.2-4.7-6.8-9-13-13-18.7-34.1-48.9-100.2-21.9-90.9 33.7 8.5 51 193.3 306.6 193.3 306.6v.3h406.1l39.7-66.7c14.1-23.8 21.6-50.9 21.6-78.6 0 0 0-147.3-.1-162.9 0-.9.1-1.8.2-2.7C772.6 476.7 804.5 240.4 811.8 189.5z" fill="none" stroke="url(#edge-pointer)" stroke-width="2"/>
  </g>
</svg>`,
        hotspot: '8 2'
    },
    text: {
        template: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad-text"><stop offset="0%" stop-color="{c1}"/><stop offset="70%" stop-color="{c2}"/><stop offset="100%" stop-color="{c3}"/></radialGradient>
    <linearGradient id="edge-text"><stop offset="0%" stop-color="{c4}"/><stop offset="100%" stop-color="{c3}"/></linearGradient>
    <filter id="sdw-text" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur"/><feOffset in="blur" dx="1.5" dy="1.5" result="offsetBlur"/><feFlood flood-color="#000" flood-opacity="0.5" result="offsetColor"/><feComposite in="offsetColor" in2="offsetBlur" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#sdw-text)">
    <path d="M8 3c.9 0 1.6.3 2.1.6.1.1.3.2.4.3.1-.1.3-.2.4-.3.5-.3 1.2-.6 2.1-.6.6 0 .6 1-0 1-.6 0-1.1.2-1.5.4-.2.1-.3.2-.4.3v5.8h1c.5 0 .5 1 0 1H11v5.8c.1.1.2.2.4.3.4.2.9.4 1.5.4.6 0 .6 1 0 1-1.1-.6-1.9-.8-2.5-1.1-.5.3-1.4.5-2.5 1.1-.5 0-.5-1 0-1 .6 0 1.1-.2 1.5-.4.2-.1.4-.2.4-.3V11.5H9c-.5 0-.5-1 0-1h1V4.7c-.1-.1-.2-.2-.4-.3-.4-.2-.9-.4-1.5-.4-.5 0-.5-1 0-1z" fill="url(#grad-text)" stroke="url(#edge-text)" stroke-width="1"/>
  </g>
</svg>`,
        hotspot: '16 16'
    },
    grabbing: {
        template: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <radialGradient id="grad-grabbing"><stop offset="0%" stop-color="{c1}"/><stop offset="70%" stop-color="{c2}"/><stop offset="100%" stop-color="{c3}"/></radialGradient>
    <linearGradient id="edge-grabbing"><stop offset="0%" stop-color="{c4}"/><stop offset="100%" stop-color="{c3}"/></linearGradient>
    <filter id="sdw-grabbing" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur"/><feOffset in="blur" dx="8" dy="8" result="offsetBlur"/><feFlood flood-color="#000" flood-opacity="0.4" result="offsetColor"/><feComposite in="offsetColor" in2="offsetBlur" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#sdw-grabbing)">
    <path d="M188 80a27.8 27.8 0 00-13.4 3.4A28 28 0 00128 72.4 28 28 0 0080 92v16H68a28 28 0 00-28 28v16a88 88 0 00176 0V108a28 28 0 00-28-28zm12 72a72 72 0 01-144 0v-20a12 12 0 0112-12H80v24a8 8 0 0016 0V92a12 12 0 0124 0v32a8 8 0 0016 0V92a12 12 0 0124 0v32a8 8 0 0016 0V108a12 12 0 0124 0z" fill="url(#grad-grabbing)" stroke="url(#edge-grabbing)" stroke-width="2"/>
  </g>
</svg>`,
        hotspot: '16 16'
    },
    ew_resize: {
        template: `
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad-ew-resize"><stop offset="0%" stop-color="{c1}"/><stop offset="70%" stop-color="{c2}"/><stop offset="100%" stop-color="{c3}"/></radialGradient>
    <linearGradient id="edge-ew-resize"><stop offset="0%" stop-color="{c4}"/><stop offset="100%" stop-color="{c3}"/></linearGradient>
    <filter id="sdw-ew-resize" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur"/><feOffset in="blur" dx="1.5" dy="1.5" result="offsetBlur"/><feFlood flood-color="#000" flood-opacity="0.5" result="offsetColor"/><feComposite in="offsetColor" in2="offsetBlur" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#sdw-ew-resize)">
    <path d="M4 16h24M10 11L4 16l6 5m12-10l6 5-6 5" fill="none" stroke="url(#grad-ew-resize)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`,
        hotspot: '16 16'
    },
    se_resize: {
        template: `
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad-se-resize"><stop offset="0%" stop-color="{c1}"/><stop offset="70%" stop-color="{c2}"/><stop offset="100%" stop-color="{c3}"/></radialGradient>
    <linearGradient id="edge-se-resize"><stop offset="0%" stop-color="{c4}"/><stop offset="100%" stop-color="{c3}"/></linearGradient>
    <filter id="sdw-se-resize" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur"/><feOffset in="blur" dx="1.5" dy="1.5" result="offsetBlur"/><feFlood flood-color="#000" flood-opacity="0.5" result="offsetColor"/><feComposite in="offsetColor" in2="offsetBlur" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#sdw-se-resize)">
    <path d="M6 6 L26 26 M19 6 L6 6 L6 19 M13 26 L26 26 L26 13" fill="none" stroke="url(#grad-se-resize)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`,
        hotspot: '16 16'
    }
};

/**
 * Inicializa el gestor de color del cursor.
 * @param {object} appStateRef - Referencia al estado global de la app.
 * @param {object} domRefs - Objeto con referencias a elementos del DOM.
 * @param {object} callbackFuncs - Objeto con funciones de callback.
 */
export function initializeCursorManager(appStateRef, domRefs, callbackFuncs) {
    appState = appStateRef;
    DOM = domRefs;
    Callbacks = callbackFuncs;

    const cursorTabContent = document.getElementById('tab-content-cursor');
    if (!cursorTabContent) {
        console.warn("No se encontraron los elementos para la gestión del color del cursor.");
        return;
    }

    renderCursorOptions(cursorTabContent);

    const cursorColorInput = document.getElementById('cursor-color-input');
    const resetCursorBtn = document.getElementById('reset-cursor-btn');

    // Cargar y aplicar el color guardado
    const savedColor = appState.settings?.cursorColor;
    applyCursorColor(savedColor || '#FFFFFF');
    if (cursorColorInput) cursorColorInput.value = savedColor || '#FFFFFF';

    // Añadir listeners
    DOM.cursorColorInput.addEventListener('input', (e) => {
        applyCursorColor(e.target.value);
    });
    
    DOM.cursorColorInput.addEventListener('change', () => {
        Callbacks.saveState(); // Guardar el estado solo cuando se confirma el color
    });

    DOM.resetCursorBtn.addEventListener('click', resetCursor);
}

/**
 * Renderiza las opciones de la pestaña de cursor.
 * @param {HTMLElement} container - El contenedor de la pestaña.
 */
function renderCursorOptions(container) {
    container.innerHTML = `
        <p class="tab-title">Color del Cursor</p>
        <div class="style-option">
            <label for="cursor-color-input">Elige un color:</label>
            <input type="color" id="cursor-color-input" value="#FFFFFF">
        </div>
        <button id="reset-cursor-btn">Restablecer Cursores</button>
    `;
    // Re-asignar referencias DOM después de renderizar
    DOM.cursorColorInput = document.getElementById('cursor-color-input');
    DOM.resetCursorBtn = document.getElementById('reset-cursor-btn');
}

/**
 * Aplica un nuevo color al cursor SVG personalizado.
 * @param {string} color - El nuevo color en formato hexadecimal.
 */
function applyCursorColor(color) {
    const shades = generateShades(color);
    const root = document.documentElement;
    Object.entries(CURSOR_TEMPLATES).forEach(([name, { template, hotspot }]) => {
        const finalSvg = template
            .replace(/{c1}/g, shades.light)
            .replace(/{c2}/g, shades.mid)
            .replace(/{c3}/g, shades.dark)
            .replace(/{c4}/g, shades.border);

        const encodedSvg = encodeURIComponent(finalSvg);
        const cursorValue = `url("data:image/svg+xml,${encodedSvg}") ${hotspot}, auto`;
        root.style.setProperty(`--cursor-${name}`, cursorValue);
    });

    // Guardar el color en el estado de la aplicación
    if (!appState.settings) {
        appState.settings = {};
    }
    appState.settings.cursorColor = color;
    if (DOM.cursorColorInput) DOM.cursorColorInput.value = color;
}

/**
 * Genera diferentes tonos de un color base para los gradientes.
 * @param {string} baseColor - Color en formato #RRGGBB.
 * @returns {{light: string, mid: string, dark: string, border: string}}
 */
function generateShades(baseColor) {
    // Convertir de #RRGGBB a [r, g, b]
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    // Función para ajustar el brillo (0-255)
    const shade = (val, percent) => Math.min(255, Math.max(0, Math.round(val * (1 + percent))));

    // Función para convertir [r, g, b] a #RRGGBB
    const toHex = (r, g, b) => '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');

    // Generar tonos
    const light = toHex(shade(r, 0.4), shade(g, 0.4), shade(b, 0.4));
    const mid = toHex(r, g, b); // El color base
    const dark = toHex(shade(r, -0.4), shade(g, -0.4), shade(b, -0.4));
    const border = toHex(shade(r, -0.6), shade(g, -0.6), shade(b, -0.6));

    return { light, mid, dark, border };
}

/**
 * Restablece el cursor al valor por defecto del navegador.
 */
function resetCursor() {
    const root = document.documentElement;
    Object.keys(CURSOR_TEMPLATES).forEach(name => {
        root.style.removeProperty(`--cursor-${name}`);
    });

    // Limpiar el color guardado en el estado
    if (appState.settings) {
        delete appState.settings.cursorColor;
    }
    
    // Restablecer el valor del color picker
    if (DOM.cursorColorInput) DOM.cursorColorInput.value = '#FFFFFF';

    Callbacks.saveState();
    Callbacks.showToast("Cursores restablecidos a su estilo original.");
}