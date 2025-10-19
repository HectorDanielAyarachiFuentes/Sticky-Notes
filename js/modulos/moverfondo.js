// js/modulos/moverfondo.js

/**
 * Inicializa la funcionalidad de paneo (mover el fondo) en el contenedor del tablero.
 * @param {HTMLElement} boardContainer - El elemento que contiene el tablero y tiene el scroll.
 * @param {HTMLElement} board - El tablero en sí, donde se colocan las notas.
 * @param {Function} [onPanCallback] - Una función a llamar durante el paneo para actualizar elementos externos.
 */
export function initializePanning(boardContainer, board, onPanCallback) {
    // Añadimos una clase para indicar que el fondo es "agarrable"
    boardContainer.classList.add('pannable');

    let isPanning = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;

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
        startScrollLeft = boardContainer.scrollLeft;
        startScrollTop = boardContainer.scrollTop;
        // Añadimos una clase al body para cambiar el cursor a "grabbing" globalmente
        document.body.classList.add('panning');
        boardContainer.style.userSelect = 'none';
    };

    const doPanning = (e) => {
        if (!isPanning) {
            return;
        }
        e.preventDefault();
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;

        boardContainer.scrollLeft = startScrollLeft - dx;
        boardContainer.scrollTop = startScrollTop - dy;

        // Notificar que el paneo ha ocurrido para que otros elementos se actualicen.
        if (onPanCallback) onPanCallback();
    };

    const stopPanning = () => {
        if (!isPanning) return;
        isPanning = false;
        // Quitamos la clase del body para restaurar el cursor
        document.body.classList.remove('panning');
        boardContainer.style.userSelect = '';

        // Notificar que el paneo ha terminado.
        if (onPanCallback) onPanCallback();
    };

    boardContainer.addEventListener('pointerdown', startPanning);
    document.addEventListener('pointermove', doPanning);
    document.addEventListener('pointerup', stopPanning);
    document.addEventListener('pointerleave', stopPanning); // Detener si el cursor sale de la ventana
}