/**
 * papelera.js
 * Módulo para gestionar la papelera de reciclaje de notas y tableros.
 */

// --- ESTADO INTERNO DEL MÓDULO (REFERENCIAS) ---
let appState;
let DOM;
let Callbacks;

/**
 * Inicializa el gestor de la papelera.
 * @param {object} appStateRef - Referencia al estado global de la app.
 * @param {object} domElements - Objeto con referencias a elementos del DOM necesarios.
 * @param {object} callbacks - Objeto con funciones de callback para interactuar con la app principal.
 */
export function initializeTrashManager(appStateRef, domElements, callbacks) {
    appState = appStateRef;
    DOM = domElements;
    Callbacks = callbacks;
}

/**
 * Mueve una nota del tablero activo a la papelera.
 * @param {string} noteId - El ID de la nota a eliminar.
 */
export function moveNoteToTrash(noteId) {
    const boardId = appState.activeBoardId;
    const noteElement = DOM.board.querySelector(`.stickynote[data-note-id="${noteId}"]`);
    if (!noteElement) return;

    noteElement.classList.add('deleting');

    noteElement.addEventListener('animationend', () => {
        const notes = appState.boards[boardId].notes;
        const noteIndex = notes.findIndex(n => n.id === noteId);

        if (noteIndex > -1) {
            const [noteToTrash] = notes.splice(noteIndex, 1);
            noteToTrash.originalBoardId = boardId;
            appState.trash.push(noteToTrash);

            // Eliminar conexiones asociadas en el estado
            appState.boards[boardId].connections = appState.boards[boardId].connections.filter(
                conn => conn.from !== noteId && conn.to !== noteId
            );

            // Eliminar visualmente las líneas usando el callback
            Callbacks.removeLinesForNote(noteId);
            noteElement.remove();

            Callbacks.saveState();
            Callbacks.updateBoardSize();
            Callbacks.showToast('Nota movida a la papelera.');

            // Actualizar la vista de la papelera si está abierta
            const trashTabContent = document.getElementById('tab-content-trash');
            if (trashTabContent && trashTabContent.classList.contains('active')) {
                renderTrash();
            }
        }
    }, { once: true });

    Callbacks.hideContextMenu();
}

/**
 * Renderiza el contenido de la papelera (notas y tableros) en la UI.
 */
export function renderTrash() {
    DOM.trashNotesContainer.innerHTML = '';
    DOM.trashBoardsContainer.innerHTML = '';

    // Renderizar Notas eliminadas
    if (appState.trash.length === 0) {
        DOM.trashNotesContainer.innerHTML = '<p class="empty-trash-message">No hay notas eliminadas.</p>';
    } else {
        appState.trash.forEach(note => {
            const item = document.createElement('div');
            item.className = 'trash-item';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = note.tabs.map(t => `${t.title} ${t.content}`).join(' ');
            const noteText = (tempDiv.textContent || tempDiv.innerText || "").trim();
            const titleText = note.tabs[note.activeTab]?.title || noteText.substring(0, 30) || 'Nota sin título';

            item.innerHTML = `
                <div class="trash-item-title">${titleText}</div>
                <div class="trash-item-content">${noteText}</div>
                <div class="trash-item-actions">
                    <button class="restore" data-note-id="${note.id}">Restaurar</button>
                    <button class="delete-perm" data-note-id="${note.id}">Borrar</button>
                </div>
            `;
            DOM.trashNotesContainer.appendChild(item);
        });

        DOM.trashNotesContainer.querySelectorAll('.restore').forEach(btn => {
            btn.addEventListener('click', () => restoreNote(btn.dataset.noteId));
        });
        DOM.trashNotesContainer.querySelectorAll('.delete-perm').forEach(btn => {
            btn.addEventListener('click', () => deletePermanently(btn.dataset.noteId));
        });
    }

    // Renderizar Tableros eliminados
    if (appState.boardsTrash.length === 0) {
        DOM.trashBoardsContainer.innerHTML = '<p class="empty-trash-message">No hay tableros eliminados.</p>';
    } else {
        appState.boardsTrash.forEach(board => {
            const item = document.createElement('div');
            item.className = 'trash-item';
            item.innerHTML = `
                <div class="trash-item-title">${board.name}</div>
                <div class="trash-item-content">${board.notes.length} nota(s)</div>
                <div class="trash-item-actions">
                    <button class="restore-board" data-board-id="${board.id}">Restaurar</button>
                    <button class="delete-perm-board" data-board-id="${board.id}">Borrar</button>
                </div>
            `;
            DOM.trashBoardsContainer.appendChild(item);
        });

        DOM.trashBoardsContainer.querySelectorAll('.restore-board').forEach(btn => {
            btn.addEventListener('click', () => restoreBoard(btn.dataset.boardId));
        });
        DOM.trashBoardsContainer.querySelectorAll('.delete-perm-board').forEach(btn => {
            btn.addEventListener('click', () => deleteBoardPermanently(btn.dataset.boardId));
        });
    }

    DOM.emptyTrashBtn.disabled = appState.trash.length === 0 && appState.boardsTrash.length === 0;
}

/**
 * Vacía completamente la papelera previa confirmación.
 */
export function emptyTrash() {
    if (confirm('¿Estás seguro de que quieres vaciar la papelera? Todos los elementos se borrarán permanentemente.')) {
        appState.trash = [];
        appState.boardsTrash = [];
        Callbacks.saveState();
        renderTrash();
        Callbacks.showToast('Papelera vaciada.');
    }
}

// --- FUNCIONES INTERNAS (NO EXPORTADAS) ---

function restoreBoard(boardId) {
    const boardIndex = appState.boardsTrash.findIndex(b => b.id === boardId);
    if (boardIndex > -1) {
        const [boardToRestore] = appState.boardsTrash.splice(boardIndex, 1);
        appState.boards[boardToRestore.id] = boardToRestore;
        Callbacks.saveState();
        renderTrash();
        Callbacks.renderBoardList();
        Callbacks.showToast(`Tablero "${boardToRestore.name}" restaurado.`);
    }
}

function deleteBoardPermanently(boardId) {
    if (confirm('Esta acción es irreversible. ¿Seguro que quieres borrar este tablero permanentemente?')) {
        appState.boardsTrash = appState.boardsTrash.filter(b => b.id !== boardId);
        Callbacks.saveState();
        renderTrash();
    }
}

function restoreNote(noteId) {
    const trashIndex = appState.trash.findIndex(n => n.id === noteId);
    if (trashIndex > -1) {
        const [noteToRestore] = appState.trash.splice(trashIndex, 1);
        const targetBoard = appState.boards[noteToRestore.originalBoardId];
        
        if (targetBoard) {
            targetBoard.notes.push(noteToRestore);
            delete noteToRestore.originalBoardId;
            Callbacks.saveState();
            renderTrash();
            if (targetBoard.id === appState.activeBoardId) {
                Callbacks.renderActiveBoard();
                Callbacks.updateBoardSize();
            }
            Callbacks.showToast('Nota restaurada.');
        } else {
            const firstBoardId = Object.keys(appState.boards)[0];
            if(firstBoardId) {
                appState.boards[firstBoardId].notes.push(noteToRestore);
                delete noteToRestore.originalBoardId;
                Callbacks.saveState();
                renderTrash();
                if (firstBoardId === appState.activeBoardId) {
                    Callbacks.renderActiveBoard();
                    Callbacks.updateBoardSize();
                }
                Callbacks.showToast(`Nota restaurada en el tablero "${appState.boards[firstBoardId].name}".`);
            } else {
                appState.trash.push(noteToRestore);
                Callbacks.showToast('❌ No hay tableros disponibles para restaurar la nota.');
            }
        }
    }
}

function deletePermanently(noteId) {
    if (confirm('Esta acción es irreversible. ¿Seguro que quieres borrar esta nota permanentemente?')) {
        appState.trash = appState.trash.filter(n => n.id !== noteId);
        Callbacks.saveState();
        renderTrash();
    }
}