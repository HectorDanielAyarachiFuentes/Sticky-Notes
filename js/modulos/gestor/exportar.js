/**
 * Inicializa toda la funcionalidad de compartir e importar tableros.
 * @param {object} appState - El estado global de la aplicación.
 * @param {function} showToast - Función para mostrar notificaciones.
 * @param {function} switchBoard - Función para cambiar de tablero.
 * @param {function} saveState - Función para guardar el estado en localStorage.
 * @param {function} renderBoardList - Función para refrescar la lista de tableros.
 */
export function initializeShareAndImport(appState, showToast, switchBoard, saveState, renderBoardList) {
    
    const shareButton = document.getElementById('share-board-btn');
    const shareLinkOutput = document.getElementById('share-link-output');

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
        if (!board) return null;

        // Creamos una copia limpia de los datos para no exportar información interna
        const boardData = {
            name: `Copia de ${board.name}`,
            notes: board.notes,
            lines: board.lines || board.connections || [], // Compatibilidad con 'connections'
            background: board.background || null,
            backgroundApplyTo: board.backgroundApplyTo || { board: true, notes: false }
        };
        return boardData;
    }

    /**
     * Crea un tablero, sus notas, líneas y fondo a partir de datos importados.
     * @param {object} boardData - Los datos del tablero a crear.
     * @returns {string} El ID del nuevo tablero.
     */
    function createBoardFromData(boardData) {
        const newBoardId = `board-${Date.now()}`;
        
        appState.boards[newBoardId] = {
            id: newBoardId,
            name: boardData.name,
            notes: boardData.notes,
            connections: boardData.lines || [], // Usamos 'connections' que es lo que usa el resto de la app
            background: boardData.background,
            backgroundApplyTo: boardData.backgroundApplyTo
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
                const boardData = JSON.parse(jsonString);

                const newBoardId = createBoardFromData(boardData);
                
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

    // --- LÓGICA PARA COMPARTIR ---
    shareButton.addEventListener('click', async () => {
        const activeBoardId = getActiveBoardId(); 
        if (!activeBoardId) { showToast('Primero selecciona un tablero para compartir.'); return; }

        const boardData = getBoardDataForSharing(activeBoardId);
        if (!boardData) { showToast('Error al recopilar los datos del tablero.'); return; }

        try {
            const jsonString = JSON.stringify(boardData);
            const base64String = btoa(unescape(encodeURIComponent(jsonString)));
            const url = new URL(window.location.origin + window.location.pathname);
            url.searchParams.set('board', base64String);
            shareLinkOutput.value = url.href;
            await navigator.clipboard.writeText(url.href);
            showToast('✅ ¡Enlace generado y copiado al portapapeles!');
        } catch (error) {
            console.error('Error al generar el enlace para compartir:', error);
            showToast('❌ Error al generar el enlace.');
        }
    });

    // --- LÓGICA PARA IMPORTAR (se ejecuta al cargar la página) ---
    handleImportFromURL();
}