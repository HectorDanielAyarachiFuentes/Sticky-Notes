import { appState, guardarEstado, setmaxZIndex } from './estado.js';
import { renderizarListaTableros, renderizarTableroActivo } from './renderizado.js';
import { dom } from './dom.js';
import { BOARD_TEMPLATES } from './constantes.js';
import { getmaxZIndex } from './interacciones.js';

export function cambiarTablero(boardId, noteToHighlightId = null) {
    if (boardId === appState.activeBoardId) return;
    appState.activeBoardId = boardId;
    guardarEstado();
    renderizarListaTableros();
    renderizarTableroActivo();
    dom.searchInput.value = '';
    dom.globalSearchResults.innerHTML = '';
    dom.board.classList.remove('searching');

    if (noteToHighlightId) {
        setTimeout(() => {
            const noteEl = dom.board.querySelector(`.stickynote[data-note-id="${noteToHighlightId}"]`);
            if (noteEl) {
                noteEl.classList.add('highlight');
                noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => noteEl.classList.remove('highlight'), 2500);
            }
        }, 100);
    }
}

export function agregarNuevoTablero() {
    const boardName = prompt("Nombre del nuevo tablero:", "Nuevo Proyecto");
    if (boardName) {
        const newBoardId = `board-${Date.now()}`;
        appState.boards[newBoardId] = {
            id: newBoardId,
            name: boardName,
            notes: [],
            connections: [],
            background: null,
            backgroundApplyTo: { board: true, notes: false }
        };
        cambiarTablero(newBoardId);
    }
}

export function crearTableroDesdePlantilla(templateType) {
    const template = BOARD_TEMPLATES[templateType];
    if (!template) return;

    const boardName = prompt(`Nombre para el tablero "${template.name}":`, template.name);
    if (boardName) {
        const newBoardId = `board-${Date.now()}`;
        let maxZ = getmaxZIndex();
        const newNotes = template.notes.map((note, index) => ({
            ...note,
            id: `note-${Date.now()}-${index}`,
            zIndex: ++maxZ,
            locked: false,
            rotation: note.rotation !== undefined ? note.rotation : (Math.random() - 0.5) * 4,
            tabs: Array(5).fill(null).map((_, tabIndex) => ({
                title: tabIndex === 0 ? (note.title || '') : '',
                content: tabIndex === 0 ? (note.content || '') : ''
            })),
            activeTab: 0,
            ...('title' in note && { title: undefined }),
            ...('content' in note && { content: undefined }),
        }));
        setmaxZIndex(maxZ);

        appState.boards[newBoardId] = {
            id: newBoardId,
            name: boardName,
            notes: newNotes,
            connections: [],
            background: null,
            backgroundApplyTo: { board: true, notes: false }
        };
        cambiarTablero(newBoardId);
    }
}