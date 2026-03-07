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

            const lineOptions = { ...restOptions };
            
            // El crosshair nativo de LeaderLine es enorme; lo escalamos para que sea compacto
            if (lineOptions.endPlug === 'crosshair') lineOptions.endPlugSize = 0.35;
            if (lineOptions.startPlug === 'crosshair') lineOptions.startPlugSize = 0.35;
            
            // Configurar sombra si está activada
            if (lineOptions.dropShadow) {
                lineOptions.dropShadow = { dx: 2, dy: 4, blur: 4, color: 'rgba(0, 0, 0, 0.4)' };
            }
            
            // Configurar animación si está activada
            if (lineOptions.dash) {
                lineOptions.dash = { animation: true };
            }

            // Configurar etiqueta si hay texto
            if (lineOptions.label && lineOptions.label.trim() !== '') {
                lineOptions.middleLabel = LeaderLine.pathLabel({
                    text: lineOptions.label,
                    color: color,
                    outlineColor: window.getComputedStyle(document.body).getPropertyValue('--bg-dark').trim() || '#1e1e1e',
                    lineOffset: 25 // Separarlo un poco de la línea para mejor lectura
                });
            }

            const line = new LeaderLine(startEl, endEl, {
                ...lineOptions,
                hide: true, // Crear la línea oculta
                color: hexToRgba(color, opacity),
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
            const newConnection = { from: connectionState.startNoteId, to: noteId };
            currentBoard.connections.push(newConnection);
            
            // En lugar de un re-renderizado completo, dibujamos solo la nueva línea.
            // Esto evita el "salto" de las notas.
            renderSingleConnection(newConnection);
            if (reRenderCallback) reRenderCallback(true, false); // Guardar estado, pero no redibujar todo.
        }
        // Resetear estado de conexión
        connectionState.startNoteId = null;
    }
}

/**
 * Dibuja una única conexión sin redibujar todo el tablero.
 * @param {object} conn - El objeto de conexión con 'from' y 'to'.
 */
function renderSingleConnection(conn) {
    const startEl = board.querySelector(`.stickynote[data-note-id="${conn.from}"]`);
    const endEl = board.querySelector(`.stickynote[data-note-id="${conn.to}"]`);

    if (startEl && endEl) {
        const { color, opacity, ...restOptions } = appState.lineOptions;

        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        const lineOptions = { ...restOptions };

        // El crosshair nativo de LeaderLine es enorme; lo escalamos para que sea compacto
        if (lineOptions.endPlug === 'crosshair') lineOptions.endPlugSize = 0.35;
        if (lineOptions.startPlug === 'crosshair') lineOptions.startPlugSize = 0.35;

        // Configurar sombra si está activada
        if (lineOptions.dropShadow) {
            lineOptions.dropShadow = { dx: 2, dy: 4, blur: 4, color: 'rgba(0, 0, 0, 0.4)' };
        }
        
        // Configurar animación si está activada
        if (lineOptions.dash) {
            lineOptions.dash = { animation: true };
        }

        // Configurar etiqueta si hay texto
        if (lineOptions.label && lineOptions.label.trim() !== '') {
            lineOptions.middleLabel = LeaderLine.pathLabel({
                text: lineOptions.label,
                color: color,
                outlineColor: window.getComputedStyle(document.body).getPropertyValue('--bg-dark').trim() || '#1e1e1e',
                lineOffset: 25
            });
        }

        const line = new LeaderLine(startEl, endEl, {
            ...lineOptions,
            hide: true,
            color: hexToRgba(color, opacity),
            endSocket: 'auto'
        });
        activeLines.push({ line, from: conn.from, to: conn.to });

        // Mostrar la línea con una animación
        line.show('draw', {
            duration: 400,
            timing: 'ease-in-out'
        });
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