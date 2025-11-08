// js/modulos/moverfondo.js

/**
 * Inicializa la funcionalidad de paneo (mover el fondo) usando transformaciones CSS.
 * @param {HTMLElement} boardContainer - El elemento que contiene el tablero y tiene el scroll.
 * @param {HTMLElement} board - El tablero en sí, donde se colocan las notas.
 * @param {object} appState - El estado de la aplicación para guardar la posición del paneo.
 * @param {Function} [onPanCallback] - Una función a llamar durante el paneo para actualizar elementos externos.
 */
export function initializePanning(boardContainer, board, appState, onPanCallback) {
    // Añadimos una clase para indicar que el fondo es "agarrable"
    boardContainer.classList.add('pannable');

    let isPanning = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let startPanX = 0;
    let startPanY = 0;

    const startPanning = (e) => {
        // Solo iniciar el paneo si se hace clic directamente en el tablero
        // o en el contenedor, pero no en una nota u otro elemento interactivo.
        // Permitir paneo con clic izquierdo (button 0) o central (button 1)
        if ((e.button !== 0 && e.button !== 1) || (e.target !== board && e.target !== boardContainer)) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation(); // ¡CLAVE! Evita que el listener de arrastre de notas se active.
        isPanning = true;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;

        // Obtener la posición actual del paneo del estado de la aplicación
        const currentBoard = appState.boards[appState.activeBoardId];
        startPanX = currentBoard.panX || 0;
        startPanY = currentBoard.panY || 0;

        // Añadimos una clase al body para cambiar el cursor a "grabbing" globalmente
        document.body.classList.add('panning');
        boardContainer.style.userSelect = 'none';
    };

    const doPanning = (e) => {
        if (!isPanning) return;

        e.preventDefault();
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;

        const currentBoard = appState.boards[appState.activeBoardId];
        if (!currentBoard) return;

        // Actualizamos la posición del paneo en el estado
        currentBoard.panX = startPanX + dx;
        currentBoard.panY = startPanY + dy;

        // Notificar que el paneo ha ocurrido para que otros elementos se actualicen.
        if (onPanCallback) onPanCallback();
    };

    const stopPanning = () => {
        if (!isPanning) return;
        isPanning = false;
        // Quitamos la clase del body para restaurar el cursor
        document.body.classList.remove('panning');
        boardContainer.style.userSelect = '';

        // Guardar el estado al finalizar el paneo (se hará en el callback principal)
        const currentBoard = appState.boards[appState.activeBoardId];
        if (!currentBoard) return;
        // No es necesario guardar aquí, el callback se encargará

        // Notificar que el paneo ha terminado.
        if (onPanCallback) onPanCallback();
    };

    boardContainer.addEventListener('pointerdown', startPanning);
    document.addEventListener('pointermove', doPanning);
    document.addEventListener('pointerup', stopPanning);
    document.addEventListener('pointerleave', stopPanning); // Detener si el cursor sale de la ventana
}