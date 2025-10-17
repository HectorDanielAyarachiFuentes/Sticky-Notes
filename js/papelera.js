import { dom } from './dom.js';
import { appState, guardarEstado } from './estado.js';
import { renderizarTableroActivo } from './renderizado.js';
import { showToast } from './notificaciones.js';
import { hideContextMenu } from './menuContextual.js';

export function moverNotaAPapelera(noteId) {
    const boardId = appState.activeBoardId;
    const notes = appState.boards[boardId].notes;
    const noteIndex = notes.findIndex(n => n.id === noteId);

    if (noteIndex > -1) {
        const [noteToTrash] = notes.splice(noteIndex, 1);
        noteToTrash.originalBoardId = boardId;
        appState.trash.push(noteToTrash);

        appState.boards[boardId].connections = appState.boards[boardId].connections.filter(
            conn => conn.from !== noteId && conn.to !== noteId
        );

        guardarEstado();
        renderizarTableroActivo();
        showToast('Nota movida a la papelera.');
    }
    hideContextMenu();
}

export function renderizarPapelera() {
    dom.trashListContainer.innerHTML = '';
    if (appState.trash.length === 0) {
        dom.trashListContainer.innerHTML = '<p style="opacity: 0.7; text-align: center;">La papelera está vacía.</p>';
        return;
    }

    appState.trash.forEach(note => {
        const item = document.createElement('div');
        item.className = 'trash-item';

        const activeTabData = note.tabs[note.activeTab] || { title: '', content: '' };
        const titleText = activeTabData.title || 'Nota sin título';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.tabs.map(t => t.content).join(' ');
        const noteText = (tempDiv.textContent || tempDiv.innerText || "").trim() || 'Nota vacía';

        item.innerHTML = `
            <div class="trash-item-title">${titleText}</div>
            <div class="trash-item-content">${noteText || 'Nota vacía'}</div>
            <div class="trash-item-actions">
                <button class="restore" data-note-id="${note.id}">Restaurar</button>
                <button data-note-id="${note.id}">Borrar</button>
            </div>
        `;
        dom.trashListContainer.appendChild(item);
    });

    dom.trashListContainer.querySelectorAll('.restore').forEach(btn => {
        btn.addEventListener('click', () => restaurarNota(btn.dataset.noteId));
    });
    dom.trashListContainer.querySelectorAll('button:not(.restore)').forEach(btn => {
        btn.addEventListener('click', () => borrarPermanentemente(btn.dataset.noteId));
    });
}

function restaurarNota(noteId) {
    const trashIndex = appState.trash.findIndex(n => n.id === noteId);
    if (trashIndex > -1) {
        const [noteToRestore] = appState.trash.splice(trashIndex, 1);
        const targetBoard = appState.boards[noteToRestore.originalBoardId];
        if (targetBoard) {
            targetBoard.notes.push(noteToRestore);
            delete noteToRestore.originalBoardId;
            guardarEstado();
            renderizarPapelera();
            if (targetBoard.id === appState.activeBoardId) {
                renderizarTableroActivo();
            }
            showToast('Nota restaurada.');
        }
    }
}

function borrarPermanentemente(noteId) {
    appState.trash = appState.trash.filter(n => n.id !== noteId);
    guardarEstado();
    renderizarPapelera();
}

export function vaciarPapelera() {
    if (confirm('¿Estás seguro de que quieres vaciar la papelera? Esta acción no se puede deshacer.')) {
        appState.trash = [];
        guardarEstado();
        renderizarPapelera();
    }
}