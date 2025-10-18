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
        DOM.trashCan.classList.add('visible');
    } 
    // CASO 2: Iniciar arrastre para CREAR una nota nueva
    else if (isPaletteNote) {
        e.preventDefault();
        ghostNote = isPaletteNote.cloneNode(true);
        ghostNote.style.position = 'fixed';
        ghostNote.style.zIndex = '9999';
        ghostNote.style.pointerEvents = 'none';
        ghostNote.style.transform = 'scale(1.1)';
        document.body.appendChild(ghostNote);

        offsetX = e.clientX - isPaletteNote.getBoundingClientRect().left;
        offsetY = e.clientY - isPaletteNote.getBoundingClientRect().top;
        ghostNote.style.left = `${e.clientX - offsetX}px`;
        ghostNote.style.top = `${e.clientY - offsetY}px`;
        DOM.trashCan.classList.add('visible');
    } 
    // CASO 3: Iniciar arrastre para MOVER una nota existente
    else if (isStickyNote && !e.target.classList.contains('connect-btn')) {
        activeNote = isStickyNote;
        activeNoteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === activeNote.dataset.noteId);
        if (activeNoteData.locked) { activeNote = null; return; }

        if (!e.target.isContentEditable) e.preventDefault();
        
        const mouseXInBoard = (e.clientX - boardRect.left) / appState.zoomLevel;
        const mouseYInBoard = (e.clientY - boardRect.top) / appState.zoomLevel;
        offsetX = mouseXInBoard - activeNote.offsetLeft;
        offsetY = mouseYInBoard - activeNote.offsetTop;

        Callbacks.bringToFront(activeNote, activeNoteData);
        if (!e.target.isContentEditable) {
            activeNote.classList.add('dragging');
            DOM.trashCan.classList.add('visible');
        }
    }
}

function handlePointerMove(e) {
    if (ghostNote) {
        ghostNote.style.left = `${e.clientX - offsetX}px`;
        ghostNote.style.top = `${e.clientY - offsetY}px`;
        const trashRect = DOM.trashCan.getBoundingClientRect();
        DOM.trashCan.classList.toggle('active', e.clientX > trashRect.left && e.clientX < trashRect.right && e.clientY > trashRect.top && e.clientY < trashRect.bottom);
        return;
    }

    if (!activeNote || (activeNoteData && activeNoteData.locked)) return;
    e.preventDefault();
    const boardRect = DOM.boardContainer.getBoundingClientRect();

    if (isResizing) {
        const newWidth = (e.clientX - activeNote.getBoundingClientRect().left) / appState.zoomLevel;
        const newHeight = (e.clientY - activeNote.getBoundingClientRect().top) / appState.zoomLevel;
        activeNoteData.width = Math.max(150, newWidth);
        activeNoteData.height = Math.max(150, newHeight);
        activeNote.style.width = `${activeNoteData.width}px`;
        activeNote.style.height = `${activeNoteData.height}px`;
        Callbacks.updateBoardSize();
    } else {
        const mouseXInBoard = (e.clientX - boardRect.left) / appState.zoomLevel;
        const mouseYInBoard = (e.clientY - boardRect.top) / appState.zoomLevel;
        activeNoteData.x = mouseXInBoard - offsetX;
        activeNoteData.y = mouseYInBoard - offsetY;
        activeNote.style.left = `${activeNoteData.x}px`;
        activeNote.style.top = `${activeNoteData.y}px`;
        Callbacks.updateBoardSize();
        Callbacks.updateAllLinesPosition();
        activeNote.style.transform = `rotate(${activeNoteData.rotation}deg) scale(1.05)`;
    }
    
    const trashRect = DOM.trashCan.getBoundingClientRect();
    DOM.trashCan.classList.toggle('active', e.clientX > trashRect.left && e.clientX < trashRect.right && e.clientY > trashRect.top && e.clientY < trashRect.bottom);
}

function handlePointerUp(e) {
    if (ghostNote) {
        const boardRect = DOM.boardContainer.getBoundingClientRect();
        const isOverBoard = e.clientX >= boardRect.left && e.clientX <= boardRect.right && e.clientY >= boardRect.top && e.clientY <= boardRect.bottom;

        if (isOverBoard && !DOM.trashCan.classList.contains('active')) {
            DOM.board.querySelector('.welcome-message')?.remove();
            
            const mouseXInBoard = (e.clientX - boardRect.left + DOM.boardContainer.scrollLeft) / appState.zoomLevel;
            const mouseYInBoard = (e.clientY - boardRect.top + DOM.boardContainer.scrollTop) / appState.zoomLevel;

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
            Callbacks.updateBoardSize();
        }
        ghostNote.remove();
        ghostNote = null;
        DOM.trashCan.classList.remove('visible', 'active');
        return;
    }

    if (!activeNote) return;

    if (DOM.trashCan.classList.contains('active')) {
        Callbacks.moveNoteToTrash(activeNoteData.id); 
    } else {
        if (!isResizing) Callbacks.updateAllLinesPosition();
        activeNote.style.transform = `rotate(${activeNoteData.rotation}deg) scale(1)`;
    }
    
    activeNote.classList.remove('dragging');
    DOM.trashCan.classList.remove('visible', 'active');
    
    activeNote = null; activeNoteData = null; isResizing = false;
    offsetX = 0; offsetY = 0;
    
    Callbacks.saveState();
    if (appState.boards[appState.activeBoardId].notes.length === 0) {
        Callbacks.renderActiveBoard();
        Callbacks.updateBoardSize();
    }
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
    
    const mouseXInBoard = (e.clientX - boardRect.left + DOM.boardContainer.scrollLeft) / appState.zoomLevel;
    const mouseYInBoard = (e.clientY - boardRect.top + DOM.boardContainer.scrollTop) / appState.zoomLevel;

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
    Callbacks.updateBoardSize();
}