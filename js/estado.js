import { getmaxZIndex, setmaxZIndex } from './interacciones.js';

export let appState = {};

export let activeNote = null;
export let activeNoteData = null;
export let offsetX = 0;
export let offsetY = 0;
export let isResizing = false;
export let contextMenuNoteId = null;
export let contextMenuTabInfo = null;
export let popoverNoteId = null;
export let popoverOriginalColor = null;
export let activeLines = [];
export let connectionState = { startNoteId: null };

export function setActiveNote(note) { activeNote = note; }
export function setActiveNoteData(data) { activeNoteData = data; }
export function setOffsets(x, y) { offsetX = x; offsetY = y; }
export function setIsResizing(resizing) { isResizing = resizing; }
export function setContextMenuNoteId(id) { contextMenuNoteId = id; }
export function setContextMenuTabInfo(info) { contextMenuTabInfo = info; }
export function setPopoverNoteId(id) { popoverNoteId = id; }
export function setPopoverOriginalColor(color) { popoverOriginalColor = color; }
export function setActiveLines(lines) { activeLines = lines; }
export function setConnectionState(state) { connectionState = state; }

export function guardarEstado() {
    localStorage.setItem('stickyNotesApp', JSON.stringify(appState));
}

export function cargarEstado() {
    const savedState = localStorage.getItem('stickyNotesApp');
    let maxZ = 0;
    if (savedState) {
        const loadedState = JSON.parse(savedState);
        // Migración: Asegurarse de que los tableros viejos tengan la nueva propiedad
        Object.values(loadedState.boards).forEach(board => {
            if (!board.backgroundApplyTo) {
                board.backgroundApplyTo = { board: true, notes: false };
            }
            board.notes.forEach(note => {
                if (note.locked === undefined) note.locked = false;
                // Migración para la nueva estructura de pestañas (título + contenido)
                if (note.tabs === undefined) {
                    // Si la nota viene del formato antiguo (title + content) o (title + tabs[string])
                    const oldTabsContent = note.content ? [note.content, '', '', '', ''] : (note.tabs || ['', '', '', '', '']);
                    note.tabs = oldTabsContent.map((content, index) => ({
                        // La primera pestaña hereda el título principal, las demás quedan vacías.
                        title: index === 0 ? (note.title || '') : '',
                        content: content || ''
                    }));
                    note.activeTab = 0;
                    delete note.content; // Eliminar propiedades antiguas
                    delete note.title;
                }
            });
            if (!loadedState.trash) {
                loadedState.trash = [];
            }
            // Migración para zIndex y cálculo del maxZIndex
            board.notes.forEach(note => {
                if (note.zIndex === undefined) {
                    note.zIndex = ++maxZ;
                } else if (note.zIndex > maxZ) {
                    maxZ = note.zIndex;
                }
            });
        });
        appState = loadedState;

    } else {
        // Estado inicial si no hay nada guardado
        const initialBoardId = `board-${Date.now()}`;
        appState = {
            boards: {
                [initialBoardId]: { id: initialBoardId, name: 'Tablero Principal', notes: [], connections: [], background: null, backgroundApplyTo: { board: true, notes: false } }
            },
            trash: [],
            zoomLevel: 1.0,
            isPalettePinned: true,
            activeBoardId: initialBoardId,
            lineOptions: { color: '#4B4B4B', opacity: 0.8, sidebarWidth: 260, size: 4, path: 'fluid', endPlug: 'arrow1' }
        };
    }
    setmaxZIndex(maxZ);
}