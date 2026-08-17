// atajosTeclado.js
// Gestor de atajos de teclado globales. Convierte combinaciones de teclas en Eventos Semánticos.

export function initializeHotkeys() {
    document.addEventListener('keydown', (e) => {
        // No interferir si el usuario está escribiendo dentro de un input o contenteditable
        const isTyping = e.target.tagName === 'INPUT' || 
                         e.target.tagName === 'TEXTAREA' || 
                         e.target.isContentEditable;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (!isTyping) {
                e.preventDefault();
                // Enviar evento semántico
                document.dispatchEvent(new CustomEvent('hotkey:delete'));
            }
        }

        if (e.ctrlKey || e.metaKey) {
            if (e.key.toLowerCase() === 'z') {
                if (!isTyping) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        document.dispatchEvent(new CustomEvent('hotkey:redo'));
                    } else {
                        document.dispatchEvent(new CustomEvent('hotkey:undo'));
                    }
                }
            }
            if (e.key.toLowerCase() === 'y') {
                if (!isTyping) {
                    e.preventDefault();
                    document.dispatchEvent(new CustomEvent('hotkey:redo'));
                }
            }
            if (e.key.toLowerCase() === 'd') {
                // Prevenir el "Añadir a marcadores" del navegador
                e.preventDefault(); 
                document.dispatchEvent(new CustomEvent('hotkey:duplicate'));
            }
        }
    });
}
