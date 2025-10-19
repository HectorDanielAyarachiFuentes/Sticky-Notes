/**
 * Inicializa toda la funcionalidad de compartir e importar tableros.
 * @param {object} appState - El estado global de la aplicación.
 * @param {object} callbacks - Objeto con funciones de callback (showToast, switchBoard, etc.).
 */
export function initializeShareAndImport(appState, callbacks) {
    const { showToast, switchBoard, saveState, renderBoardList } = callbacks;
    
    const shareButton = document.getElementById('share-board-btn');
    const shareLinkOutput = document.getElementById('share-link-output');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importJsonBtn = document.getElementById('import-json-btn');
    const importJsonInput = document.getElementById('import-json-input');

    if (!shareButton || !exportJsonBtn || !importJsonBtn || !importJsonInput) {
        console.warn("No se encontraron todos los elementos de import/export.");
        return;
    }

    // --- LÓGICA DE EVENTOS ---
    shareButton.addEventListener('click', handleShareLink);
    exportJsonBtn.addEventListener('click', exportBoardToJson);
    importJsonBtn.addEventListener('click', () => importJsonInput.click());
    importJsonInput.addEventListener('change', handleJsonImport);

    // --- FUNCIONES INTERNAS ---
    /**
     * Obtiene el ID del tablero activo.
     * @returns {string}
     */
    function getActiveBoardId() {
        return appState.activeBoardId;
    }

    /**
     * Recopila todos los datos relevantes del tablero activo para compartir.
     * @param {string} boardId - El ID del tablero a exportar.
     * @returns {object | null}
     */
    function getBoardDataForSharing(boardId) {
        const board = appState.boards[boardId];
        if (!board) { showToast('Error: No se encontró el tablero.'); return null; }

        // Creamos una copia limpia de los datos para no exportar información interna
        const boardData = {
            notes: board.notes,
            connections: board.connections || [],
            background: board.background || null,
            backgroundApplyTo: board.backgroundApplyTo || { board: true, notes: false }
        };
        return boardData;
    }

    /**
     * Crea un tablero, sus notas, líneas y fondo a partir de datos importados.
     * @param {object} importedData - Los datos del tablero a crear.
     * @param {string} boardName - El nombre para el nuevo tablero.
     * @returns {string} El ID del nuevo tablero.
     */
    function createBoardFromData(importedData, boardName) {
        const newBoardId = `board-${Date.now()}`;
        
        appState.boards[newBoardId] = {
            id: newBoardId,
            name: boardName,
            ...importedData,
            connections: importedData.connections || importedData.lines || [], // Compatibilidad
        };
        
        saveState();
        renderBoardList(); // Actualizamos la lista de tableros en la UI
        return newBoardId;
    }

    /**
     * Revisa la URL al cargar la página en busca de datos para importar.
     */
    function handleImportFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const boardDataParam = urlParams.get('board');

        if (boardDataParam) {
            try {
                // Decodificar desde Base64 y parsear el JSON.
                const jsonString = decodeURIComponent(escape(atob(boardDataParam)));
                const importedData = JSON.parse(jsonString);

                // Validar datos importados
                if (!Array.isArray(importedData.notes)) throw new Error("Datos de tablero inválidos.");

                const newBoardId = createBoardFromData(importedData, `Copia de Tablero`);
                
                // Cambiar a la vista del tablero recién importado.
                switchBoard(newBoardId); 

                showToast(`✨ Tablero "${boardData.name}" importado con éxito.`);

                // Limpia la URL para que no se re-importe al recargar la página.
                const cleanUrl = new URL(window.location.origin + window.location.pathname);
                window.history.replaceState({}, document.title, cleanUrl);

            } catch (error) {
                console.error('Error al importar el tablero desde la URL:', error);
                showToast('❌ El enlace de importación parece estar dañado o es inválido.');
            }
        }
    }

    /**
     * Maneja la generación y copia del enlace para compartir.
     */
    async function handleShareLink() {
        const activeBoardId = getActiveBoardId(); 
        if (!activeBoardId) { showToast('Primero selecciona un tablero para compartir.'); return; }

        const boardData = getBoardDataForSharing(activeBoardId);
        if (!boardData) { showToast('Error al recopilar los datos del tablero.'); return; }

        // Mostramos el textarea y lo enfocamos para que el usuario vea que algo pasó
        shareLinkOutput.style.display = 'block';
        shareLinkOutput.value = 'Generando enlace...';

        try {
            const jsonString = JSON.stringify(boardData);
            const base64String = btoa(unescape(encodeURIComponent(jsonString)));
            const url = new URL(window.location.origin + window.location.pathname);
            url.searchParams.set('board', base64String);
            
            shareLinkOutput.value = url.href;
            shareLinkOutput.select();
            await navigator.clipboard.writeText(url.href);

            showToast('✅ ¡Enlace generado y copiado al portapapeles!');
        } catch (error) {
            console.error('Error al generar el enlace para compartir:', error);
            showToast('❌ Error al generar el enlace.');
            shareLinkOutput.value = 'Error al generar el enlace.';
        }
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

        const boardData = getBoardDataForSharing(appState.activeBoardId);
        const boardJson = JSON.stringify(boardData, null, 2);
        const blob = new Blob([boardJson], { type: 'application/json' });
        const filename = `${currentBoard.name.replace(/ /g, '_')}.json`;
        
        triggerDownload(blob, filename);
        showToast(`Tablero "${currentBoard.name}" exportado.`);
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
                const importedData = JSON.parse(e.target.result);
                if (!Array.isArray(importedData.notes)) {
                    throw new Error("El archivo JSON no tiene el formato de tablero esperado.");
                }
                const newBoardName = `Copia de ${file.name.replace('.json', '')}`;
                const newBoardId = createBoardFromData(importedData, newBoardName);
                switchBoard(newBoardId);
                showToast(`Tablero "${newBoardName}" importado con éxito.`);
            } catch (error) {
                console.error("Error al importar el JSON:", error);
                showToast("Error: El archivo no es un JSON de tablero válido.");
            } finally {
                event.target.value = ''; // Reseteamos el input
            }
        };
        reader.readAsText(file);
    }

    // --- LÓGICA PARA IMPORTAR (se ejecuta al cargar la página) ---
    handleImportFromURL();
}