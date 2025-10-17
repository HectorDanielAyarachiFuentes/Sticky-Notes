import { dom } from './dom.js';
import { appState, guardarEstado, activeNote, activeNoteData, isResizing, connectionState, activeLines, setActiveNote, setActiveNoteData, setOffsets, setIsResizing } from './estado.js';
import { crearElementoNotaAdhesiva } from './renderizado.js';
import { moverNotaAPapelera } from './papelera.js';
import { handleConnectionClick } from './conexiones.js';

let maxZIndex = 0;
export function getmaxZIndex() { return maxZIndex; }
export function setmaxZIndex(value) { maxZIndex = value; }

export function bringToFront(noteElement, noteData) {
    if (noteData.zIndex >= maxZIndex) return; // Ya está al frente
    noteData.zIndex = ++maxZIndex;
    noteElement.style.zIndex = noteData.zIndex;
    guardarEstado();
}

export function handlePointerDown(e) {
    const target = e.target;
    const boardRect = dom.boardContainer.getBoundingClientRect();

    // CASO 1: Iniciar redimensión
    if (target.classList.contains('resizer')) {
        e.preventDefault();
        setIsResizing(true);
        const noteEl = target.closest('.stickynote');
        setActiveNote(noteEl);
        const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === noteEl.dataset.noteId);
        setActiveNoteData(noteData);
        if (noteData.locked) { setIsResizing(false); setActiveNote(null); return; }
        bringToFront(noteEl, noteData);
        noteEl.classList.add('dragging');
        dom.trashCan.classList.add('visible');
        return;
    }

    // Si estamos en modo conexión, un clic en una nota crea la conexión
    if (connectionState.startNoteId && e.target.closest('.stickynote')) {
        const noteEl = e.target.closest('.stickynote');
        if (noteEl) {
            e.preventDefault();
            handleConnectionClick(noteEl.dataset.noteId);
        }
        return;
    }

    // CASO 2: Iniciar arrastre para CREAR una nota nueva
    if (target.classList.contains('palette-note')) {
        e.preventDefault();
        dom.board.querySelector('.welcome-message')?.remove();

        const color = target.dataset.color;
        const mouseXInBoard = (e.clientX - boardRect.left) / appState.zoomLevel;
        const mouseYInBoard = (e.clientY - boardRect.top) / appState.zoomLevel;

        const newNoteData = {
            id: `note-${Date.now()}`,
            tabs: Array(5).fill(null).map(() => ({ title: '', content: '' })),
            activeTab: 0,
            width: 200, height: 200, color: color,
            rotation: (Math.random() - 0.5) * 8,
            locked: false,
            zIndex: ++maxZIndex,
            x: mouseXInBoard - (100 / appState.zoomLevel),
            y: mouseYInBoard - (100 / appState.zoomLevel),
        };

        appState.boards[appState.activeBoardId].notes.push(newNoteData);
        const noteEl = crearElementoNotaAdhesiva(newNoteData, true);
        setActiveNote(noteEl);
        setActiveNoteData(newNoteData);
        
        setOffsets(100 / appState.zoomLevel, 100 / appState.zoomLevel);

        noteEl.classList.add('dragging');
        dom.trashCan.classList.add('visible');
    }

    // CASO 3: Iniciar arrastre para MOVER una nota existente
    const noteToDrag = target.closest('.stickynote');
    if (noteToDrag && !target.classList.contains('resizer') && !target.classList.contains('connect-btn')) {
        setActiveNote(noteToDrag);
        const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === noteToDrag.dataset.noteId);
        setActiveNoteData(noteData);
        if (noteData.locked) { setActiveNote(null); return; }

        if (!target.classList.contains('stickynote-text') && !target.classList.contains('stickynote-title')) e.preventDefault();

        const mouseXInBoard = (e.clientX - boardRect.left) / appState.zoomLevel;
        const mouseYInBoard = (e.clientY - boardRect.top) / appState.zoomLevel;
        setOffsets(mouseXInBoard - noteToDrag.offsetLeft, mouseYInBoard - noteToDrag.offsetTop);

        bringToFront(noteToDrag, noteData);
        if (!target.classList.contains('stickynote-text') && !target.classList.contains('stickynote-title')) {
            noteToDrag.classList.add('dragging');
            dom.trashCan.classList.add('visible');
        }
    }
}

export function handlePointerMove(e) {
    if (!activeNote || (activeNoteData && activeNoteData.locked)) return;
    e.preventDefault();

    const boardRect = dom.boardContainer.getBoundingClientRect();

    if (isResizing) {
        const newWidth = (e.clientX - activeNote.getBoundingClientRect().left) / appState.zoomLevel;
        const newHeight = (e.clientY - activeNote.getBoundingClientRect().top) / appState.zoomLevel;
        activeNoteData.width = Math.max(150, newWidth);
        activeNoteData.height = Math.max(150, newHeight);
        activeNote.style.width = `${activeNoteData.width}px`;
        activeNote.style.height = `${activeNoteData.height}px`;
    } else {
        const mouseXInBoard = (e.clientX - boardRect.left) / appState.zoomLevel;
        const mouseYInBoard = (e.clientY - boardRect.top) / appState.zoomLevel;
        const newX = mouseXInBoard - activeNoteData.offsetX;
        const newY = mouseYInBoard - activeNoteData.offsetY;

        activeNoteData.x = newX;
        activeNoteData.y = newY;
        activeNote.style.left = `${newX}px`;
        activeNote.style.top = `${newY}px`;
        
        activeLines.forEach(l => {
            if (l.from === activeNoteData.id || l.to === activeNoteData.id) {
                l.line.position();
            }
        });
        activeNote.style.transform = `rotate(${activeNoteData.rotation}deg) scale(1.05)`;
    }

    const trashRect = dom.trashCan.getBoundingClientRect();
    if (e.clientX > trashRect.left && e.clientX < trashRect.right && e.clientY > trashRect.top && e.clientY < trashRect.bottom) {
        dom.trashCan.classList.add('active');
    } else {
        dom.trashCan.classList.remove('active');
    }
}

export function handlePointerUp() {
    if (!activeNote) return;

    if (dom.trashCan.classList.contains('active')) {
        moverNotaAPapelera(activeNoteData.id);
    } else {
        if (!isResizing) activeLines.forEach(l => l.line.position());
        activeNote.style.transform = `rotate(${activeNoteData.rotation}deg) scale(1)`;
    }
    
    activeNote.classList.remove('dragging');
    dom.trashCan.classList.remove('visible', 'active');
    
    setActiveNote(null);
    setActiveNoteData(null);
    setIsResizing(false);
    setOffsets(0, 0);
    
    guardarEstado();
    if (appState.boards[appState.activeBoardId].notes.length === 0) {
        // renderActiveBoard(); // This would create a circular dependency
    }
}

export function handleWheelRotate(e) {
    if (!activeNote || isResizing || (activeNoteData && activeNoteData.locked)) return;

    e.preventDefault();

    const rotationIncrement = e.deltaY > 0 ? 2 : -2;
    activeNoteData.rotation = (activeNoteData.rotation + rotationIncrement) % 360;

    activeNote.style.transform = `rotate(${activeNoteData.rotation}deg) scale(1.05)`;
}