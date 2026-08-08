/**
 * interaccionesNotas.js
 * Módulo para gestionar todas las interacciones del usuario con las notas:
 * - Arrastrar para crear desde la paleta.
 * - Arrastrar para mover notas existentes.
 * - Redimensionar notas.
 * - Rotar notas con la rueda del ratón al arrastrar.
 * - Crear notas con doble clic en el tablero.
 */

// --- ESTADO INTERNO DEL MÓDULO ---
let appState, DOM, Callbacks;

let activeNote = null;      // Elemento del DOM que se está arrastrando/redimensionando
let activeNoteData = null;  // Objeto de la nota en el 'appState'
let offsetX = 0;
let offsetY = 0;
let ghostNote = null;       // Para la previsualización al arrastrar desde la paleta
let isResizing = false;

/**
 * Inicializa el gestor de interacciones de notas.
 * @param {object} appStateRef - Referencia al estado global de la app.
 * @param {object} domRefs - Objeto con referencias a elementos del DOM.
 * @param {object} callbackFuncs - Objeto con funciones de callback para interactuar con la app principal.
 */
export function initializeNoteInteractions(appStateRef, domRefs, callbackFuncs) {
    appState = appStateRef;
    DOM = domRefs;
    Callbacks = callbackFuncs;

    // Asignar los listeners a los elementos correspondientes
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('wheel', handleWheelRotate, { passive: false });
    DOM.boardContainer.addEventListener('dblclick', handleBoardDoubleClick);
}

// --- LÓGICA DE INTERACCIÓN (FUNCIONES INTERNAS) ---

let originalNoteX = 0; // Guardamos posicion original antes de arrastrar
let originalNoteY = 0;

function handlePointerDown(e) {
    const isResizer = e.target.classList.contains('resizer');
    const isPaletteNote = e.target.closest('.palette-note');
    const isStickyNote = e.target.closest('.stickynote');

    if (!isResizer && !isPaletteNote && !isStickyNote) return;

    const boardRect = DOM.boardContainer.getBoundingClientRect();
    
    // Si estamos en modo conexión, un clic en una nota crea la conexión
    const isConnecting = document.querySelector('.stickynote.connection-start');
    if (isConnecting && isStickyNote) {
        e.preventDefault();
        Callbacks.handleConnectionClick(isStickyNote.dataset.noteId);
        return;
    }

    // CASO 1: Iniciar redimensión
    if (isResizer) {
        e.preventDefault();
        activeNote = e.target.closest('.stickynote');
        activeNoteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === activeNote.dataset.noteId);
        if (activeNoteData.locked) { activeNote = null; return; }
        isResizing = true;
        Callbacks.bringToFront(activeNote, activeNoteData);
        activeNote.classList.add('dragging');
        // No mostramos la papelera al redimensionar
    } 
    // CASO 2: Iniciar arrastre para CREAR una nota nueva
    else if (isPaletteNote) {
        e.preventDefault();
        ghostNote = isPaletteNote.cloneNode(true);

        // ¡CRÍTICO! Quitar la clase 'palette-note' del ghost ANTES de añadirlo al body.
        // Si el body tiene clase 'palette-top' o 'palette-bottom', el CSS de esos modos
        // aplica `position: relative !important` a todos los .palette-note descendientes del body,
        // lo cual anularía nuestro `ghostNote.style.position = 'fixed'`.
        const noteColor = isPaletteNote.dataset.color;
        ghostNote.className = 'palette-ghost';          // Clase neutra sin reglas CSS conflictivas
        ghostNote.dataset.color = noteColor;             // Preservar para handlePointerUp

        ghostNote.style.position    = 'fixed';
        ghostNote.style.zIndex      = '9999';
        ghostNote.style.pointerEvents = 'none';
        ghostNote.style.transform   = 'scale(1.08)';
        ghostNote.style.width       = '50px';
        ghostNote.style.height      = '65px';
        ghostNote.style.borderRadius = '8px';
        ghostNote.style.backgroundColor = noteColor || '#FFF9C4';
        ghostNote.style.boxShadow   = '0 8px 24px rgba(0,0,0,0.4)';
        ghostNote.style.opacity     = '0.92';
        document.body.appendChild(ghostNote);

        // Centrar el ghost en el cursor
        const GHOST_W = 50;
        const GHOST_H = 65;
        offsetX = GHOST_W / 2;
        offsetY = GHOST_H / 2;
        ghostNote.style.left = `${e.clientX - offsetX}px`;
        ghostNote.style.top  = `${e.clientY - offsetY}px`;
        DOM.trashCan.classList.add('visible');
    } 
    // CASO 3: Iniciar arrastre para MOVER una nota existente
    else if (isStickyNote && !e.target.classList.contains('connect-btn')) {
        activeNote = isStickyNote;
        activeNoteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === activeNote.dataset.noteId);
        if (activeNoteData.locked) { activeNote = null; return; }
        
        if (!e.target.isContentEditable) e.preventDefault();
        
        // ¡CORRECCIÓN! Considerar el paneo actual del tablero para un cálculo de offset preciso.
        const currentBoard = appState.boards[appState.activeBoardId];
        const panX = currentBoard.panX || 0;
        const panY = currentBoard.panY || 0;
        const mouseXInBoard = (e.clientX - boardRect.left - panX) / appState.zoomLevel;
        const mouseYInBoard = (e.clientY - boardRect.top - panY) / appState.zoomLevel;
        offsetX = mouseXInBoard - activeNote.offsetLeft;
        offsetY = mouseYInBoard - activeNote.offsetTop;

        // Guardamos original por si el usuario cancela en la papelera
        originalNoteX = activeNoteData.x;
        originalNoteY = activeNoteData.y;
        
        Callbacks.bringToFront(activeNote, activeNoteData);
        if (!e.target.isContentEditable) {
            activeNote.classList.add('dragging');
            // La visibilidad de la papelera se activa en handlePointerMove, no en handlePointerDown
            // para evitar que parpadee si solo se hace clic en la nota sin moverla (ej. al prepararse para arrastrar o hacer zoom con mouse).
        }
    }
}

let animationFrameId = null;
let currentEventX = 0;
let currentEventY = 0;

function handlePointerMove(e) {
    if (ghostNote) {
        // no-op
    } else if (!activeNote || (activeNoteData && activeNoteData.locked)) {
        return;
    } else {
        e.preventDefault();
    }

    currentEventX = e.clientX;
    currentEventY = e.clientY;

    if (animationFrameId) return;

    animationFrameId = requestAnimationFrame(() => {
        if (ghostNote) {
            ghostNote.style.left = `${currentEventX - offsetX}px`;
            ghostNote.style.top = `${currentEventY - offsetY}px`;
            const trashRect = DOM.trashCan.getBoundingClientRect();
            DOM.trashCan.classList.toggle('active', currentEventX > trashRect.left && currentEventX < trashRect.right && currentEventY > trashRect.top && currentEventY < trashRect.bottom);
        } else if (activeNote && !(activeNoteData && activeNoteData.locked)) {
            const boardRect = DOM.boardContainer.getBoundingClientRect();

            if (isResizing) {
                const currentBoard = appState.boards[appState.activeBoardId];
                const panX = currentBoard.panX || 0;
                const panY = currentBoard.panY || 0;
                const noteRect = activeNote.getBoundingClientRect();

                const newWidth = (currentEventX - noteRect.left) / appState.zoomLevel;
                const newHeight = (currentEventY - noteRect.top) / appState.zoomLevel;
                activeNoteData.width = Math.max(150, newWidth);
                activeNoteData.height = Math.max(150, newHeight);
                activeNote.style.width = `${activeNoteData.width}px`;
                activeNote.style.height = `${activeNoteData.height}px`;
                DOM.trashCan.classList.remove('visible', 'active');
            } else {
                DOM.trashCan.classList.add('visible');
                
                const currentBoard = appState.boards[appState.activeBoardId];
                const mouseXInBoard = (currentEventX - boardRect.left - (currentBoard.panX || 0)) / appState.zoomLevel;
                const mouseYInBoard = (currentEventY - boardRect.top - (currentBoard.panY || 0)) / appState.zoomLevel;
                activeNoteData.x = mouseXInBoard - offsetX;
                activeNoteData.y = mouseYInBoard - offsetY;
                activeNote.style.left = `${activeNoteData.x}px`;
                activeNote.style.top = `${activeNoteData.y}px`;
                Callbacks.updateAllLinesPosition();
                activeNote.style.transform = `rotate(${activeNoteData.rotation}deg) scale(1.05)`;
                
                const trashRect = DOM.trashCan.getBoundingClientRect();
                DOM.trashCan.classList.toggle('active', currentEventX > trashRect.left && currentEventX < trashRect.right && currentEventY > trashRect.top && currentEventY < trashRect.bottom);
            }
        }
        animationFrameId = null;
    });
}

async function handlePointerUp(e) {
    if (ghostNote) {
        const boardRect = DOM.boardContainer.getBoundingClientRect();

        // Detectar si la paleta está en modo horizontal y ajustar la zona válida del board.
        // En esos modos la paleta ocupa 58px del viewport (top o bottom) con position:fixed,
        // pero el boardRect del #board-container ya NO incluye esa franja (position:fixed no afecta al flow).
        // Solo necesitamos verificar que el cursor esté dentro del boardRect.
        const palettePos = document.body.classList.contains('palette-top')    ? 'top'
                         : document.body.classList.contains('palette-bottom') ? 'bottom'
                         : null;
        const PALETTE_H = 58;
        let isOverBoard;
        if (palettePos === 'top') {
            // Board ocupa de 58px a 100vh; el boardRect.top ya es ~58, solo verificar Y > 58
            isOverBoard = e.clientX >= boardRect.left && e.clientX <= boardRect.right
                       && e.clientY >= PALETTE_H      && e.clientY <= window.innerHeight;
        } else if (palettePos === 'bottom') {
            // Board ocupa de 0 a (100vh - 58px)
            isOverBoard = e.clientX >= boardRect.left && e.clientX <= boardRect.right
                       && e.clientY >= 0              && e.clientY <= (window.innerHeight - PALETTE_H);
        } else {
            isOverBoard = e.clientX >= boardRect.left  && e.clientX <= boardRect.right
                       && e.clientY >= boardRect.top   && e.clientY <= boardRect.bottom;
        }

        if (isOverBoard && !DOM.trashCan.classList.contains('active')) {            
            DOM.board.querySelector('.welcome-message')?.remove();
            
            // ¡CORRECCIÓN! Considerar el paneo para la posición inicial de la nueva nota.
            const currentBoard = appState.boards[appState.activeBoardId];
            const panX = currentBoard?.panX || 0;
            const panY = currentBoard?.panY || 0;
            const mouseXInBoard = (e.clientX - boardRect.left - panX) / appState.zoomLevel;
            const mouseYInBoard = (e.clientY - boardRect.top - panY) / appState.zoomLevel;

            const newNoteData = {
                id: `note-${Date.now()}`,
                tabs: Array(5).fill(null).map((_, index) => ({
                    title: index === 0 ? 'Nueva Nota' : '', content: ''
                })),
                activeTab: 0,
                width: 200, height: 200, color: ghostNote.dataset.color,
                rotation: (Math.random() - 0.5) * 8,
                locked: false, zIndex: Callbacks.getNewZIndex(),
                x: mouseXInBoard - (100 / appState.zoomLevel),
                y: mouseYInBoard - (100 / appState.zoomLevel),
            };

            if (!appState.activeBoardId) {
                const newBoardId = Callbacks.createDefaultBoard();
                Callbacks.switchBoard(newBoardId);
                Callbacks.showToast('Hemos creado un nuevo tablero para ti.');
            }
            appState.boards[appState.activeBoardId].notes.push(newNoteData);
            Callbacks.createStickyNoteElement(newNoteData, true);
            Callbacks.saveState();
        }
        ghostNote.remove();
        ghostNote = null;
        DOM.trashCan.classList.remove('visible', 'active');
        return;
    }

    if (!activeNote) return;

    if (DOM.trashCan.classList.contains('active')) {
        // Guardar estado local antes de await para evitar bugs de reentrada
        const noteId = activeNoteData.id;
        const noteEl = activeNote;
        const origX = originalNoteX;
        const origY = originalNoteY;

        // Limpiar estado global de arrastre INMEDIATAMENTE
        activeNote.classList.remove('dragging');
        activeNote = null; activeNoteData = null; isResizing = false;
        offsetX = 0; offsetY = 0;

        const performDelete = () => {
            Callbacks.moveNoteToTrash(noteId); 
            DOM.trashCan.classList.remove('visible', 'active');
        };

        if (appState.promptBeforeDeleteNote) {
            const userRes = await Callbacks.showConfirmationModal(
                "Eliminar Nota", 
                "¿Estás seguro de que quieres eliminar esta nota? No te preocupes, puedes recuperarla después desde la pestaña de Papelera o usando el botón Deshacer.",
                true
            );
            
            if (userRes.dontAskAgain) {
                appState.promptBeforeDeleteNote = false;
                Callbacks.saveState();
            }

            if (userRes.confirmed) {
                performDelete();
                return; 
            } else {
                // Devolver la nota a su posición original
            const currentBoard = appState.boards[appState.activeBoardId];
            if (currentBoard) {
                const nData = currentBoard.notes.find(n => n.id === noteId);
                if (nData) {
                    nData.x = origX; 
                    nData.y = origY;
                    noteEl.style.left = `${nData.x}px`;
                    noteEl.style.top = `${nData.y}px`;
                    noteEl.style.transform = `rotate(${nData.rotation}deg) scale(1)`;
                }
            }
            Callbacks.updateAllLinesPosition();
            DOM.trashCan.classList.remove('visible', 'active');
            Callbacks.saveState();
            return;
        }
        } else {
            // Eliminar sin preguntar
            performDelete();
            return;
        }
    } else {
        if (!isResizing) Callbacks.updateAllLinesPosition();
        activeNote.style.transform = `rotate(${activeNoteData.rotation}deg) scale(1)`;
    }
    
    activeNote.classList.remove('dragging');
    DOM.trashCan.classList.remove('visible', 'active');
    
    activeNote = null; activeNoteData = null; isResizing = false;
    offsetX = 0; offsetY = 0;
    
    Callbacks.saveState();
}

function handleWheelRotate(e) {
    if (!activeNote || isResizing || (activeNoteData && activeNoteData.locked)) return;
    e.preventDefault();
    const rotationIncrement = e.deltaY > 0 ? 2 : -2;
    activeNoteData.rotation = (activeNoteData.rotation + rotationIncrement) % 360;
    activeNote.style.transform = `rotate(${activeNoteData.rotation}deg) scale(1.05)`;
}
    
function handleBoardDoubleClick(e) {
    if (e.target !== DOM.board && e.target !== DOM.boardContainer) return;

    DOM.board.querySelector('.welcome-message')?.remove();
    const boardRect = DOM.boardContainer.getBoundingClientRect();
    // ¡CORRECCIÓN! Considerar el paneo para la posición de la nueva nota.
    const currentBoard = appState.boards[appState.activeBoardId];
    const panX = currentBoard?.panX || 0;
    const panY = currentBoard?.panY || 0;
    const mouseXInBoard = (e.clientX - boardRect.left - panX) / appState.zoomLevel;
    const mouseYInBoard = (e.clientY - boardRect.top - panY) / appState.zoomLevel;

    const newNoteData = {
        id: `note-${Date.now()}`,
        tabs: Array(5).fill(null).map((_, index) => ({
            title: index === 0 ? 'Nueva Nota' : '', content: ''
        })),
        activeTab: 0,
        width: 200, height: 200, color: '#FFF9C4',
        rotation: (Math.random() - 0.5) * 8,
        locked: false, zIndex: Callbacks.getNewZIndex(),
        x: mouseXInBoard, y: mouseYInBoard,
    };

    if (!appState.activeBoardId) {
        const newBoardId = Callbacks.createDefaultBoard();
        Callbacks.switchBoard(newBoardId);
        Callbacks.showToast('Hemos creado un nuevo tablero para ti.');
    }
    appState.boards[appState.activeBoardId].notes.push(newNoteData);
    Callbacks.createStickyNoteElement(newNoteData, true);
    Callbacks.saveState();
}