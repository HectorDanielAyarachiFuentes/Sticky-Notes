/**
 * lineas.js
 * Módulo para gestionar la creación, actualización y eliminación de líneas de conexión
 * entre notas usando la librería LeaderLine.
 */

// --- ESTADO INTERNO DEL MÓDULO ---
let appState; // Referencia al estado principal de la aplicación
let board;    // Referencia al elemento del DOM del tablero
let reRenderCallback; // Callback para solicitar un re-renderizado completo

let activeLines = []; // Almacena las instancias de LeaderLine activas
let connectionState = { startNoteId: null }; // Gestiona la creación de conexiones en dos pasos

/**
 * Inicializa el gestor de líneas. Debe llamarse una vez al iniciar la aplicación.
 * @param {object} appStateRef - Referencia al objeto de estado global de la app.
 * @param {HTMLElement} boardRef - Referencia al elemento del DOM #board.
 * @param {Function} renderCallback - Función a llamar para refrescar el tablero (ej. renderActiveBoard).
 */
export function initializeLineManager(appStateRef, boardRef, renderCallback) {
    appState = appStateRef;
    board = boardRef;
    reRenderCallback = renderCallback;
}

/**
 * Elimina todas las instancias de LeaderLine activas del DOM y limpia el array.
 */
export function removeActiveLines() {
    activeLines.forEach(l => l.line.remove());
    activeLines = [];
}

/**
 * Dibuja las conexiones para el tablero activo basándose en los datos de appState.
 */
export function renderConnections() {
    const currentBoard = appState.boards[appState.activeBoardId];
    if (!currentBoard || !currentBoard.connections) return;

    currentBoard.connections.forEach(conn => {
        const startEl = board.querySelector(`.stickynote[data-note-id="${conn.from}"]`);
        const endEl = board.querySelector(`.stickynote[data-note-id="${conn.to}"]`);

        if (startEl && endEl) {
            const { color, opacity, ...restOptions } = appState.lineOptions;

            // Función para convertir HEX a RGBA
            const hexToRgba = (hex, alpha) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };

            const line = new LeaderLine(startEl, endEl, {
                ...restOptions,
                hide: true, // Crear la línea oculta
                color: hexToRgba(color, opacity),
                startSocket: 'auto',
                endSocket: 'auto'
            });
            activeLines.push({ line, from: conn.from, to: conn.to });

            // Mostrar la línea con una animación de dibujado
            line.show('draw', {
                duration: 400,
                timing: 'ease-in-out'
            });
        }
    });
}

/**
 * Recalcula la posición de todas las líneas activas.
 * Esencial para el zoom, paneo y arrastre de notas.
 */
export function updateAllLinesPosition() {
    activeLines.forEach(l => l.line.position());
}

/**
 * Maneja el clic en el botón de conexión de una nota para iniciar o completar una línea.
 * @param {string} noteId - El ID de la nota en la que se hizo clic.
 */
export function handleConnectionClick(noteId) {
    const startNoteEl = board.querySelector(`.stickynote[data-note-id="${connectionState.startNoteId}"]`);
    if (startNoteEl) startNoteEl.classList.remove('connection-start');

    if (!connectionState.startNoteId) {
        // Iniciar conexión
        connectionState.startNoteId = noteId;
        const noteEl = board.querySelector(`.stickynote[data-note-id="${noteId}"]`);
        if (noteEl) noteEl.classList.add('connection-start');
    } else {
        // Finalizar conexión
        if (connectionState.startNoteId !== noteId) {
            const currentBoard = appState.boards[appState.activeBoardId];
            currentBoard.connections.push({ from: connectionState.startNoteId, to: noteId });
            // appState es una referencia, no necesitamos "guardarlo" desde aquí.
            // Solicitamos un re-renderizado para que el script principal actualice la UI.
            if (reRenderCallback) reRenderCallback(true); // El true indica que también hay que guardar el estado.
        }
        // Resetear estado de conexión
        connectionState.startNoteId = null;
    }
}

/**
 * Elimina visualmente las líneas conectadas a una nota específica.
 * @param {string} noteId - El ID de la nota cuyas líneas se eliminarán.
 */
export function removeLinesForNote(noteId) {
    const linesToRemove = activeLines.filter(l => l.from === noteId || l.to === noteId);
    linesToRemove.forEach(l => l.line.remove());
    activeLines = activeLines.filter(l => l.from !== noteId && l.to !== noteId);
}