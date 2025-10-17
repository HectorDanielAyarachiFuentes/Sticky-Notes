import { dom } from './dom.js';
import { appState } from './estado.js';
import { cambiarTablero } from './tableros.js';

export function handleSearch() {
    const searchTerm = dom.searchInput.value.toLowerCase().trim();
    dom.globalSearchResults.innerHTML = '';

    if (searchTerm === '') {
        dom.board.classList.remove('searching');
        dom.board.querySelectorAll('.stickynote').forEach(noteEl => {
            noteEl.classList.remove('highlight');
        });
        return;
    }

    dom.board.classList.add('searching');
    
    Object.values(appState.boards).forEach(currentBoard => {
        currentBoard.notes.forEach(note => {
            const tempDiv = document.createElement('div');
            const searchableText = note.tabs.map(tab => `${tab.title} ${tab.content}`).join(' ');

            tempDiv.innerHTML = searchableText;
            const noteText = tempDiv.textContent || tempDiv.innerText || "";

            if (noteText.toLowerCase().includes(searchTerm)) {
                if (currentBoard.id === appState.activeBoardId) {
                    const noteEl = dom.board.querySelector(`.stickynote[data-note-id="${note.id}"]`);
                    noteEl?.classList.add('highlight');
                } 
                else {
                    const resultItem = document.createElement('div');
                    resultItem.classList.add('search-result-item');
                    resultItem.innerHTML = `
                        <span class="board-name">${currentBoard.name}</span>
                        <span class="note-snippet">${noteText.substring(0, 100)}</span>
                    `;
                    resultItem.addEventListener('click', () => {
                        cambiarTablero(currentBoard.id, note.id);
                    });
                    dom.globalSearchResults.appendChild(resultItem);
                }
            } else {
                if (currentBoard.id === appState.activeBoardId) {
                    const noteEl = dom.board.querySelector(`.stickynote[data-note-id="${note.id}"]`);
                    noteEl?.classList.remove('highlight');
                }
            }
        });
    });
}