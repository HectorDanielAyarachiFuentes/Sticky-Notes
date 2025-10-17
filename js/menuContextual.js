import { dom } from './dom.js';
import { appState, guardarEstado, contextMenuNoteId, contextMenuTabInfo, popoverNoteId, popoverOriginalColor, setContextMenuNoteId, setContextMenuTabInfo, setPopoverNoteId, setPopoverOriginalColor } from './estado.js';
import { isColorDark } from './utilidades.js';
import { crearElementoNotaAdhesiva } from './renderizado.js';
import { moverNotaAPapelera } from './papelera.js';
import { getmaxZIndex, setmaxZIndex } from './interacciones.js';
import { EXTENDED_COLORS } from './constantes.js';

export function handleContextMenu(e) {
    const tabElement = e.target.closest('.stickynote-tab');
    if (tabElement) {
        e.preventDefault();
        setContextMenuTabInfo({ noteId: tabElement.closest('.stickynote').dataset.noteId, tabIndex: parseInt(tabElement.dataset.tabIndex, 10) });
        showTabContextMenu(e.clientX, e.clientY);
        return;
    }

    const noteElement = e.target.closest('.stickynote');
    if (noteElement) {
        e.preventDefault();
        hideTabContextMenu();
        setContextMenuNoteId(noteElement.dataset.noteId);
        
        const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === contextMenuNoteId);
        dom.ctxLockBtn.textContent = noteData.locked ? 'Desbloquear Nota' : 'Bloquear Nota';

        dom.contextMenu.style.top = `${e.clientY}px`;
        dom.contextMenu.style.left = `${e.clientX}px`;
        dom.contextMenu.classList.remove('hidden');
    } else {
        hideContextMenu();
        hideTabContextMenu();
    }
}

function showTabContextMenu(x, y) {
    hideContextMenu();
    dom.tabContextMenu.style.top = `${y}px`;
    dom.tabContextMenu.style.left = `${x}px`;
    dom.tabContextMenu.classList.remove('hidden');
}

export function hideTabContextMenu() {
    dom.tabContextMenu.classList.add('hidden');
    setContextMenuTabInfo(null);
}

export function hideContextMenu() {
    dom.contextMenu.classList.add('hidden');
    setContextMenuNoteId(null);
}

export function limpiarPestana() {
    if (!contextMenuTabInfo) return;
    const { noteId, tabIndex } = contextMenuTabInfo;
    hideTabContextMenu();

    const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === noteId);
    const noteElement = dom.board.querySelector(`.stickynote[data-note-id="${noteId}"]`);
    if (!noteData || !noteElement) return;

    if (!confirm('¿Estás seguro de que quieres limpiar el título y el contenido de esta pestaña?')) {
        return;
    }

    const titleElement = noteElement.querySelector('.stickynote-title');
    const contentElement = noteElement.querySelector(`.stickynote-text[data-tab-index="${tabIndex}"]`);
    const tabElement = noteElement.querySelector(`.stickynote-tab[data-tab-index="${tabIndex}"]`);

    contentElement.classList.add('clearing-out');

    contentElement.addEventListener('animationend', () => {
        noteData.tabs[tabIndex] = { title: '', content: '' };
        guardarEstado();

        contentElement.innerHTML = '';
        if (noteData.activeTab === tabIndex) {
            titleElement.innerHTML = '';
        }
        const titlePart = tabElement.querySelector('.stickynote-tab-part[data-part="title"]');
        const contentPart = tabElement.querySelector('.stickynote-tab-part[data-part="content"]');
        titlePart.className = 'stickynote-tab-part empty';
        contentPart.className = 'stickynote-tab-part empty';
        contentElement.classList.remove('clearing-out');
    }, { once: true });
}

export function duplicarNota() {
    if (!contextMenuNoteId) return;
    const originalNoteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === contextMenuNoteId);
    if (!originalNoteData) return;

    let maxZ = getmaxZIndex();
    const newNoteData = {
        id: `note-${Date.now()}`,
        ...JSON.parse(JSON.stringify(originalNoteData)),
        x: originalNoteData.x + 20,
        y: originalNoteData.y + 20,
        zIndex: ++maxZ,
        locked: false
    };
    setmaxZIndex(maxZ);

    appState.boards[appState.activeBoardId].notes.push(newNoteData);
    crearElementoNotaAdhesiva(newNoteData, true);
    guardarEstado();
    hideContextMenu();
}

export function toggleLockNote() {
    if (!contextMenuNoteId) return;
    const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === contextMenuNoteId);
    const noteElement = dom.board.querySelector(`.stickynote[data-note-id="${contextMenuNoteId}"]`);
    if (!noteData || !noteElement) return;

    noteData.locked = !noteData.locked;
    noteElement.classList.toggle('locked');
    noteElement.querySelector('.stickynote-title').contentEditable = !noteData.locked;
    noteElement.querySelectorAll('.stickynote-text').forEach(el => el.contentEditable = !noteData.locked);

    guardarEstado();
    hideContextMenu();
}

export function deleteNoteFromContext() {
    if (!contextMenuNoteId) return;
    moverNotaAPapelera(contextMenuNoteId);
}

export function showColorPopover() {
    if (!contextMenuNoteId) return;
    const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === contextMenuNoteId);
    if (!noteData) return;

    setPopoverNoteId(contextMenuNoteId);
    setPopoverOriginalColor(noteData.color);

    for (const swatch of dom.popoverPalette.children) {
        const isActive = swatch.dataset.color === noteData.color;
        swatch.classList.toggle('active', isActive);
        swatch.classList.toggle('light-bg', isActive && !isColorDark(swatch.dataset.color));
        swatch.classList.toggle('dark-bg', isActive && isColorDark(swatch.dataset.color));
    }
    
    const menuRect = dom.contextMenu.getBoundingClientRect();
    dom.colorPopover.style.top = `${menuRect.top}px`;
    dom.colorPopover.style.left = `${menuRect.right + 10}px`;
    dom.colorPopover.classList.remove('hidden');
    hideContextMenu();
}

export function hideColorPopover() {
    if (!dom.colorPopover.classList.contains('hidden') && popoverOriginalColor) {
        const noteElement = dom.board.querySelector(`.stickynote[data-note-id="${popoverNoteId}"]`);
        if (noteElement) {
            noteElement.style.backgroundColor = popoverOriginalColor;
        }
    }
    dom.colorPopover.classList.add('hidden');
    setPopoverOriginalColor(null);
    setPopoverNoteId(null);
}

function changeNoteColor(newColor) {
    if (!popoverNoteId) return;
    const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === popoverNoteId);
    const noteElement = dom.board.querySelector(`.stickynote[data-note-id="${popoverNoteId}"]`);

    if (noteData && noteElement) {
        setPopoverOriginalColor(null);
        noteData.color = newColor;
        noteElement.style.backgroundColor = newColor;
        noteElement.classList.toggle('dark-theme', isColorDark(newColor));
        guardarEstado();
    }
    hideColorPopover();
}

export function initializeColorPopover() {
    const previewNoteColor = (color) => {
        if (!popoverNoteId) return;
        const noteElement = dom.board.querySelector(`.stickynote[data-note-id="${popoverNoteId}"]`);
        if (noteElement) {
            noteElement.style.backgroundColor = color;
            noteElement.classList.toggle('dark-theme', isColorDark(color));
        }
    };

    EXTENDED_COLORS.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color;
        swatch.addEventListener('click', () => changeNoteColor(color));
        swatch.addEventListener('mouseenter', () => previewNoteColor(color));
        dom.popoverPalette.appendChild(swatch);
    });

    dom.popoverPalette.addEventListener('mouseleave', () => {
        if (popoverOriginalColor) {
            const noteElement = dom.board.querySelector(`.stickynote[data-note-id="${popoverNoteId}"]`);
            if (noteElement) previewNoteColor(popoverOriginalColor);
        }
    });
}