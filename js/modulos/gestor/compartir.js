// compartir.js

/**
 * Módulo para gestionar la importación y exportación de tableros.
 * Funcionalidades:
 * - Exportar el tablero actual a JSON, PNG y SVG.
 * - Importar un tablero desde un archivo JSON.
 */

// --- Variables del Módulo ---
let appState;
let showToast;
let switchBoard;
let saveState;
let renderBoardList;

/**
 * Inicializa el gestor de importación/exportación.
 * @param {object} appStateRef - Referencia al estado global de la app.
 * @param {function} showToastFunc - Función para mostrar notificaciones.
 * @param {function} switchBoardFunc - Función para cambiar de tablero.
 * @param {function} saveStateFunc - Función para guardar el estado.
 * @param {function} renderBoardListFunc - Función para renderizar la lista de tableros.
 */
export function initializeShareAndImport(appStateRef, showToastFunc, switchBoardFunc, saveStateFunc, renderBoardListFunc) {
    appState = appStateRef;
    showToast = showToastFunc;
    switchBoard = switchBoardFunc;
    saveState = saveStateFunc;
    renderBoardList = renderBoardListFunc;

    // --- Selección de Elementos del DOM ---
    // Asegúrate de que estos IDs existen en tu HTML
    const exportJsonBtn = document.querySelector("#export-json-btn");
    const exportPngBtn = document.querySelector("#export-png-btn");
    const exportSvgBtn = document.querySelector("#export-svg-btn");
    const importJsonInput = document.querySelector("#import-json-input");
    const importJsonBtn = document.querySelector("#import-json-btn");

    if (!exportJsonBtn || !exportPngBtn || !exportSvgBtn || !importJsonInput || !importJsonBtn) {
        console.warn("No se encontraron todos los botones de import/export. La funcionalidad estará deshabilitada.");
        return;
    }

    // --- Asignación de Eventos ---
    exportJsonBtn.addEventListener('click', exportBoardToJson);
    exportPngBtn.addEventListener('click', exportBoardToPng);
    exportSvgBtn.addEventListener('click', exportBoardToSvg);
    
    // El botón real dispara un clic en el input de archivo oculto
    importJsonBtn.addEventListener('click', () => importJsonInput.click());
    importJsonInput.addEventListener('change', handleJsonImport);
}

/**
 * Crea un enlace de descarga y lo activa.
 * @param {Blob} blob - El contenido a descargar.
 * @param {string} filename - El nombre del archivo.
 */
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Exporta el tablero activo a un archivo JSON.
 */
function exportBoardToJson() {
    const currentBoard = appState.boards[appState.activeBoardId];
    if (!currentBoard) {
        showToast("No hay un tablero activo para exportar.");
        return;
    }

    const boardData = JSON.stringify(currentBoard, null, 2);
    const blob = new Blob([boardData], { type: 'application/json' });
    const filename = `${currentBoard.name.replace(/ /g, '_')}.json`;
    
    triggerDownload(blob, filename);
    showToast(`Tablero "${currentBoard.name}" exportado como JSON.`);
}

/**
 * Maneja la selección de un archivo JSON para importar.
 * @param {Event} event 
 */
function handleJsonImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedBoard = JSON.parse(e.target.result);

            // Validación básica del objeto importado
            if (!importedBoard.id || !importedBoard.name || !Array.isArray(importedBoard.notes)) {
                throw new Error("El archivo JSON no tiene el formato de tablero esperado.");
            }

            // Para evitar conflictos, generamos nuevos IDs para el tablero y sus notas
            const oldId = importedBoard.id;
            const newBoardId = `board-${Date.now()}`;
            importedBoard.id = newBoardId;
            importedBoard.createdAt = Date.now();
            
            // Mapeo de IDs antiguos a nuevos para reconstruir conexiones
            const noteIdMap = new Map();
            importedBoard.notes.forEach(note => {
                const oldNoteId = note.id;
                const newNoteId = `note-${Date.now()}-${Math.random()}`;
                note.id = newNoteId;
                noteIdMap.set(oldNoteId, newNoteId);
            });

            // Actualizar IDs en las conexiones
            if (Array.isArray(importedBoard.connections)) {
                importedBoard.connections.forEach(conn => {
                    conn.from = noteIdMap.get(conn.from);
                    conn.to = noteIdMap.get(conn.to);
                });
                // Filtramos conexiones que hayan quedado huérfanas
                importedBoard.connections = importedBoard.connections.filter(c => c.from && c.to);
            }

            appState.boards[newBoardId] = importedBoard;
            saveState();
            renderBoardList();
            switchBoard(newBoardId); // Cambiamos al tablero recién importado
            
            showToast(`Tablero "${importedBoard.name}" importado con éxito.`);

        } catch (error) {
            console.error("Error al importar el JSON:", error);
            showToast("Error: El archivo no es un JSON de tablero válido.");
        } finally {
            // Reseteamos el input para poder importar el mismo archivo de nuevo
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

/**
 * Exporta el tablero a una imagen PNG usando html2canvas.
 */
function exportBoardToPng() {
    const boardElement = document.querySelector("#board");
    const boardName = appState.boards[appState.activeBoardId]?.name || 'tablero';
    
    if (!boardElement) return;

    // Usamos html2canvas (debe estar importado en el HTML)
    if (typeof html2canvas === 'undefined') {
        showToast("Error: La librería html2canvas no está cargada.");
        console.error("html2canvas is not defined. Please include it in your HTML file.");
        return;
    }
    
    showToast("Generando imagen PNG... esto puede tardar un momento.");
    
    // Opción para mejorar calidad y renderizado
    const options = {
        scale: window.devicePixelRatio * 1.5, // Aumenta la resolución
        useCORS: true,
        logging: false,
        backgroundColor: window.getComputedStyle(document.querySelector('#board-container')).backgroundColor
    };

    html2canvas(boardElement, options).then(canvas => {
        canvas.toBlob(function(blob) {
            triggerDownload(blob, `${boardName.replace(/ /g, '_')}.png`);
        });
    }).catch(err => {
        console.error("Error al generar PNG:", err);
        showToast("Ocurrió un error al generar la imagen PNG.");
    });
}


/**
 * Exporta el tablero a un archivo SVG.
 */
function exportBoardToSvg() {
    const boardElement = document.querySelector("#board");
    const boardName = appState.boards[appState.activeBoardId]?.name || 'tablero';
    
    if (!boardElement) return;

    // Clonamos el nodo para no afectar el DOM original
    const boardClone = boardElement.cloneNode(true);
    boardClone.style.transform = ''; // Resetear la escala del zoom

    // La serialización de CSS es compleja, esta es una aproximación
    const css = `
        .stickynote { box-shadow: 5px 5px 7px rgba(33,33,33,.7); border-radius: 4px; padding: 15px; font-family: 'Comic Sans MS', cursive, sans-serif; display: flex; flex-direction: column; }
        .stickynote-title { font-weight: bold; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 5px; margin-bottom: 10px; }
        .dark-theme { color: white; }
    `;

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${boardElement.scrollWidth}" height="${boardElement.scrollHeight}">
            <style>${css}</style>
            <foreignObject x="0" y="0" width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml">
                    ${boardClone.innerHTML}
                </div>
            </foreignObject>
        </svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(blob, `${boardName.replace(/ /g, '_')}.svg`);
    showToast("Exportado a SVG (puede requerir ajustes manuales).");
}