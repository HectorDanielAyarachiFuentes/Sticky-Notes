import { state } from './estadoApp.js';

let dom = {};

export function initializeTableros(elements) {
    dom = elements;
    
    // Suscribirnos a los cambios de estado para actualizar la lista de tableros si es necesario
    // Para evitar ciclos infinitos o repintados bruscos, podríamos ser selectivos, 
    // pero por ahora podemos suscribirnos y repintar la lista completa.
    state.subscribe(() => {
        renderBoardList();
    });
    
    renderBoardList();
}

function renderBoardList() {
    if (!dom.boardList) return;
    
    const appState = state.get();
    dom.boardList.innerHTML = '';
    
    Object.values(appState.boards).forEach(boardData => {
        const li = document.createElement('li');
        li.dataset.boardId = boardData.id;
        li.className = boardData.id === appState.activeBoardId ? 'active' : '';
        
        const mainInfo = document.createElement('div');
        mainInfo.className = 'board-item-main';
        mainInfo.addEventListener('click', () => switchBoard(boardData.id));
        
        const nameSpan = document.createElement('div');
        nameSpan.className = 'board-name-text';
        nameSpan.textContent = boardData.name;
        
        const dateSpan = document.createElement('div');
        dateSpan.className = 'board-creation-date';
        if (boardData.createdAt) {
            const date = new Date(boardData.createdAt);
            dateSpan.textContent = date.toLocaleString(undefined, {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            dateSpan.title = `Creado el ${date.toLocaleDateString()} a las ${date.toLocaleTimeString()}`;
        }
        
        mainInfo.appendChild(nameSpan);
        mainInfo.appendChild(dateSpan);
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'board-item-buttons';
        buttonsContainer.innerHTML = `<button class="board-item-btn" title="Editar nombre">✏️</button><button class="board-item-btn" title="Eliminar tablero">🗑️</button>`;
        
        buttonsContainer.querySelector('[title="Editar nombre"]').addEventListener('click', (e) => {
            e.stopPropagation(); 
            editBoardName(boardData.id);
        });
        
        buttonsContainer.querySelector('[title="Eliminar tablero"]').addEventListener('click', (e) => {
            e.stopPropagation(); 
            deleteBoard(boardData.id);
        });
        
        li.appendChild(mainInfo);
        li.appendChild(buttonsContainer);
        dom.boardList.appendChild(li);
    });
}

export function switchBoard(boardId, noteToHighlightId = null) {
    const appState = state.get();
    if (boardId === appState.activeBoardId) return;
    
    state.set({ activeBoardId: boardId });
    
    if (dom.searchInput) dom.searchInput.value = '';
    if (dom.globalSearchResults) dom.globalSearchResults.innerHTML = '';
    if (dom.board) dom.board.classList.remove('searching');
    
    // Disparar evento para que notasDOM y las líneas se actualicen
    document.dispatchEvent(new CustomEvent('boardSwitched', { detail: { noteToHighlightId } }));
}

function editBoardName(boardId) {
    const appState = state.get();
    const boardData = appState.boards[boardId];
    if (!boardData) return;
    
    const newName = prompt("Nuevo nombre para el tablero:", boardData.name);
    if (newName && newName.trim() !== '') {
        state.updateBoard(boardId, { name: newName.trim() });
        document.dispatchEvent(new CustomEvent('showToast', { detail: `Tablero renombrado a "${newName.trim()}".` }));
    }
}

export async function deleteBoard(boardId) {
    const appState = state.get();
    const boardToDelete = appState.boards[boardId];
    const isLastBoard = Object.keys(appState.boards).length <= 1;
    
    const confirmMessage = isLastBoard
        ? `¿Estás seguro de que quieres eliminar el último tablero "${boardToDelete.name}"?`
        : `¿Estás seguro de que quieres mover el tablero "${boardToDelete.name}" a la papelera?`;
        
    // Usamos el CustomEvent para pedir confirmación ya que el modal está en script o utils
    document.dispatchEvent(new CustomEvent('requestConfirmation', {
        detail: {
            title: 'Alerta',
            message: confirmMessage,
            onConfirm: () => executeDeleteBoard(boardId, boardToDelete)
        }
    }));
}

function executeDeleteBoard(boardId, boardToDelete) {
    const appState = state.get();
    
    const newBoardsTrash = [...appState.boardsTrash, boardToDelete];
    const newBoards = { ...appState.boards };
    delete newBoards[boardId];
    
    let newActiveBoardId = appState.activeBoardId;
    if (appState.activeBoardId === boardId) {
        const firstBoardId = Object.keys(newBoards)[0] || null;
        newActiveBoardId = firstBoardId;
    }
    
    state.set({
        boardsTrash: newBoardsTrash,
        boards: newBoards,
        activeBoardId: newActiveBoardId
    });
    
    document.dispatchEvent(new CustomEvent('showToast', { detail: `Tablero "${boardToDelete.name}" movido a la papelera.` }));
    document.dispatchEvent(new CustomEvent('boardSwitched'));
}
