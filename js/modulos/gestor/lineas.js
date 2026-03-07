/**
 * lineas.js
 * Módulo para gestionar la creación, actualización y eliminación de líneas de conexión
 * entre notas usando la librería LeaderLine.
 */

// --- ESTADO INTERNO DEL MÓDULO ---
let appState; // Referencia al estado principal de la aplicación
let board;    // Referencia al elemento del DOM del tablero
let reRenderCallback; // Callback para solicitar un re-renderizado completo

export let activeLines = []; // Almacena las instancias de LeaderLine activas
let connectionState = { startNoteId: null }; // Gestiona la creación de conexiones en dos pasos

// Elementos y estado para el menú contextual de líneas
const lineContextMenu = document.getElementById('line-context-menu');
const ctxLineEdit = document.getElementById('ctx-line-edit');
const ctxLineDelete = document.getElementById('ctx-line-delete');
let currentLineContext = null;

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
            // Combinar las opciones globales por defecto con las específicas de esta conexión
            const defaultOpts = appState.lineOptions || {};
            const specificOpts = conn.options || {};
            const finalOptions = { ...defaultOpts, ...specificOpts };

            const { color, opacity, ...restOptions } = finalOptions;

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

            // Añadir evento para borrar al hacer clic en la línea
            const svgElement = document.querySelector(`body > .leader-line:last-of-type`);
            if (svgElement) {
                // Remove pointer-events override so css handles it properly
                svgElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openLineContextMenu(e, conn.from, conn.to, line);
                });
            }
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
            
            // Comprobar si ya existe una conexión exacta (misma dirección)
            const exists = currentBoard.connections.some(conn => 
                conn.from === connectionState.startNoteId && conn.to === noteId
            );

            if (!exists) {
                const newConnection = { from: connectionState.startNoteId, to: noteId };
                currentBoard.connections.push(newConnection);
                
                // En lugar de un re-renderizado completo, dibujamos solo la nueva línea.
                // Esto evita el "salto" de las notas.
                renderSingleConnection(newConnection);
                if (reRenderCallback) reRenderCallback(true, false); // Guardar estado, pero no redibujar todo.
            } else {
                // Opcional: mostrar un mensaje o simplemente ignorar
                if (window.showToast) window.showToast('La conexión ya existe.');
            }
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

        // Añadir evento para borrar al hacer clic en la línea
        const svgElement = document.querySelector(`body > .leader-line:last-of-type`);
        if (svgElement) {
            svgElement.addEventListener('click', (e) => {
                e.stopPropagation();
                openLineContextMenu(e, conn.from, conn.to, line);
            });
        }
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

/**
 * Elimina una línea específica tanto visualmente como del estado de la aplicación.
 * @param {string} fromId - ID de la nota de origen.
 * @param {string} toId - ID de la nota de destino.
 * @param {LeaderLine} lineInstance - Instancia de LeaderLine a eliminar.
 */
function deleteSpecificLine(fromId, toId, lineInstance) {
    if (appState.lineOptions.promptBeforeDelete) {
        if (!confirm('¿Estás seguro de que quieres borrar esta conexión?')) {
            return;
        }
    }

    // 1. Quitar del DOM
    lineInstance.remove();

    // 2. Quitar del array interno de activeLines
    activeLines = activeLines.filter(l => l.line !== lineInstance);

    // 3. Quitar del estado global de la aplicación
    const currentBoard = appState.boards[appState.activeBoardId];
    if (currentBoard && currentBoard.connections) {
        const indexToRem = currentBoard.connections.findIndex(c => c.from === fromId && c.to === toId);
        if (indexToRem !== -1) {
            currentBoard.connections.splice(indexToRem, 1);
            if (reRenderCallback) reRenderCallback(true, false); // Guardar estado
            if (window.showToast) window.showToast('Conexión eliminada.');
        }
    }
}

/**
 * Abre el menú contextual de una línea al hacerle clic.
 */
function openLineContextMenu(e, fromId, toId, lineInstance) {
    if (!lineContextMenu) return;

    // Guarda los datos de la línea seleccionada en el estado local
    currentLineContext = { fromId, toId, lineInstance };

    // Posiciona el menú cerca del cursor, asegurando que no se salga de la pantalla
    const menuWidth = 170; // min-width del CSS
    const menuHeight = 90; // altura aproximada con 2 opciones
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let posX = e.clientX;
    let posY = e.clientY;

    if (posX + menuWidth > windowWidth) posX = windowWidth - menuWidth - 10;
    if (posY + menuHeight > windowHeight) posY = windowHeight - menuHeight - 10;

    lineContextMenu.style.left = `${posX}px`;
    lineContextMenu.style.top = `${posY}px`;
    lineContextMenu.classList.remove('hidden');

    // Despachar un evento global para cerrar otros menús si los hay
    document.dispatchEvent(new CustomEvent('closeOtherMenus'));
}

/**
 * Edita el texto de una línea.
 */
function editSpecificLine(fromId, toId) {
    const currentBoard = appState.boards[appState.activeBoardId];
    if (currentBoard && currentBoard.connections) {
        const connection = currentBoard.connections.find(c => c.from === fromId && c.to === toId);
        if (connection) {
            const newLabel = prompt('Ingrese el nuevo texto para la línea:', connection.options?.label || '');
            if (newLabel !== null) { // Si el usuario no canceló
                // Asegurar que exista el objeto de opciones
                if (!connection.options) connection.options = {};
                connection.options.label = newLabel;
                
                // Re-dibujar TODAS las líneas (y el tablero) para reflejar el cambio visualmente
                if (reRenderCallback) reRenderCallback(true, true);
                if (window.showToast) window.showToast('Texto de línea actualizado.');
            }
        }
    }
}

// Global listener para ocultar el menú de línea al hacer clic fuera
document.addEventListener('click', (e) => {
    if (lineContextMenu && !lineContextMenu.classList.contains('hidden') && !e.target.closest('#line-context-menu')) {
        lineContextMenu.classList.add('hidden');
    }
});

// Listener personalizado para ocultar el menú si se abre otro
document.addEventListener('closeOtherMenus', () => {
    // Si queremos cerrar otros menús, esto lo maneja script.js en su evento global.
    // Aquí solo añadimos la clase hidden si no estamos controlando nosotros este evento.
});

// Inicializar eventos de los botones del menú contextual si existen
if (ctxLineEdit) {
    ctxLineEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentLineContext) {
            editSpecificLine(currentLineContext.fromId, currentLineContext.toId);
        }
        lineContextMenu.classList.add('hidden');
        currentLineContext = null;
    });
}

if (ctxLineDelete) {
    ctxLineDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentLineContext) {
            deleteSpecificLine(currentLineContext.fromId, currentLineContext.toId, currentLineContext.lineInstance);
        }
        lineContextMenu.classList.add('hidden');
        currentLineContext = null;
    });
}