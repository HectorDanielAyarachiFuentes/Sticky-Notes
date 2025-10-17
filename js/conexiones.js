import { dom } from './dom.js';
import { appState, guardarEstado, connectionState, activeLines, setActiveLines } from './estado.js';
import { renderizarTableroActivo } from './renderizado.js';

export function handleConnectionClick(noteId) {
    const startNoteEl = dom.board.querySelector(`.stickynote[data-note-id="${connectionState.startNoteId}"]`);
    if (startNoteEl) startNoteEl.classList.remove('connection-start');

    if (!connectionState.startNoteId) {
        connectionState.startNoteId = noteId;
        const noteEl = dom.board.querySelector(`.stickynote[data-note-id="${noteId}"]`);
        noteEl.classList.add('connection-start');
    } else {
        if (connectionState.startNoteId !== noteId) {
            const currentBoard = appState.boards[appState.activeBoardId];
            currentBoard.connections.push({ from: connectionState.startNoteId, to: noteId });
            guardarEstado();
            renderizarTableroActivo();
        }
        connectionState.startNoteId = null;
    }
}

export function renderConnections() {
    const currentBoard = appState.boards[appState.activeBoardId];
    if (!currentBoard.connections) currentBoard.connections = [];

    currentBoard.connections.forEach(conn => {
        const startEl = dom.board.querySelector(`.stickynote[data-note-id="${conn.from}"]`);
        const endEl = dom.board.querySelector(`.stickynote[data-note-id="${conn.to}"]`);

        if (startEl && endEl) {
            const { color, opacity, ...restOptions } = appState.lineOptions;
            
            const hexToRgba = (hex, alpha) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };

            const line = new LeaderLine(startEl, endEl, { ...restOptions, color: hexToRgba(color, opacity), startSocket: 'auto', endSocket: 'auto' });
            activeLines.push({ line, from: conn.from, to: conn.to });
        }
    });
}

export function removeActiveLines() {
    activeLines.forEach(l => l.line.remove());
    setActiveLines([]);
}