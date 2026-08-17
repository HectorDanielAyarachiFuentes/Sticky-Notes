import { state } from './estadoApp.js';

let dom = {};

export function initializeNotasDOM(elements) {
    dom = elements;
    
    // Escuchar cambios de tablero para renderizar el nuevo tablero
    document.addEventListener('boardSwitched', (e) => {
        renderActiveBoard(true, true);
        const noteToHighlightId = e.detail?.noteToHighlightId;
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
    });
}

export function renderActiveBoard(shouldSave = false, fullRedraw = true) {
    if (shouldSave) state.save();
    
    if (!fullRedraw) return;

    if (!dom.board) return;
    
    dom.board.innerHTML = '';
    // Disparamos evento para que lineas.js quite las líneas
    document.dispatchEvent(new CustomEvent('removeActiveLines'));
    
    const appState = state.get();
    const currentBoard = appState.boards[appState.activeBoardId];
    
    if (!currentBoard) { 
        dom.board.style.transform = 'scale(1) translate(0,0)'; 
        return; 
    }
    
    const DEFAULT_BOARD_BACKGROUND = `repeating-linear-gradient(90deg, hsla(280,0%,67%,0.06) 0px, hsla(280,0%,67%,0.06) 1px,transparent 1px, transparent 96px),repeating-linear-gradient(0deg, hsla(280,0%,67%,0.06) 0px, hsla(280,0%,67%,0.06) 1px,transparent 1px, transparent 96px),repeating-linear-gradient(0deg, hsla(280,0%,67%,0.09) 0px, hsla(280,0%,67%,0.09) 1px,transparent 1px, transparent 12px),repeating-linear-gradient(90deg, hsla(280,0%,67%,0.09) 0px, hsla(280,0%,67%,0.09) 1px,transparent 1px, transparent 12px),linear-gradient(90deg, hsl(226,47%,26%),hsl(226,47%,26%))`;
    
    if (dom.boardContainer) {
        dom.boardContainer.style.background = currentBoard.backgroundBoard || DEFAULT_BOARD_BACKGROUND;
    }
    
    document.dispatchEvent(new CustomEvent('updateBackgroundUI', { detail: currentBoard }));
    document.dispatchEvent(new CustomEvent('updateZoom'));

    if (currentBoard.notes.length === 0) {
        const welcomeMsg = document.createElement('div');
        welcomeMsg.classList.add('welcome-message');
        welcomeMsg.innerHTML = '¡Bienvenido! <br>Arrastra una nota o haz doble clic para comenzar.';
        dom.board.appendChild(welcomeMsg);
    } else {
        const fragment = document.createDocumentFragment();
        currentBoard.notes.forEach(noteData => createStickyNoteElement(noteData, false, fragment));
        dom.board.appendChild(fragment);
    }
    
    // Disparamos evento para que lineas.js pinte las líneas
    document.dispatchEvent(new CustomEvent('renderConnections'));
}

export function isColorDark(hexColor) {
    if (!hexColor || hexColor.length < 7) return false;
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return luminance < 128;
}

export function createStickyNoteElement(noteData, isNew = false, container = null) {
    if (!container) container = dom.board;
    if (!container) return; // Si no hay DOM, fallamos en silencio
    
    const appState = state.get();
    
    const sticky = document.createElement("div");
    sticky.className = `stickynote ${noteData.locked ? 'locked' : ''} ${isColorDark(noteData.color) ? 'dark-theme' : ''}`;
    sticky.dataset.noteId = noteData.id;
    sticky.style.cssText = `left:${noteData.x}px; top:${noteData.y}px; width:${noteData.width}px; height:${noteData.height}px; background-color:${noteData.color}; transform:rotate(${noteData.rotation}deg); z-index:${noteData.zIndex};`;
    
    const currentBoard = appState.boards[appState.activeBoardId];
    if (currentBoard && currentBoard.backgroundNotes) {
        sticky.style.backgroundImage = currentBoard.backgroundNotes;
    }
    
    if (noteData.image) {
        sticky.style.setProperty('--note-image', `url('${noteData.image}')`);
        sticky.classList.add('has-image');
    }
    
    const title = document.createElement("div");
    title.contentEditable = !noteData.locked;
    title.className = "stickynote-title";
    title.setAttribute("placeholder", "Título...");
    title.innerHTML = noteData.tabs[noteData.activeTab].title || '';
    
    let titleDebounceTimer;
    title.addEventListener('input', () => {
        clearTimeout(titleDebounceTimer);
        titleDebounceTimer = setTimeout(() => {
            // Se asume que el objeto es mutado aquí directamente. Lo ideal en Redux es inmutabilidad
            // pero para esta refactorización Vanilla preservamos la lógica.
            noteData.tabs[noteData.activeTab].title = title.innerHTML;
            state.save(); // Dispara la persistencia
        }, 800);
    });

    title.addEventListener('blur', () => {
        const newTitle = title.innerHTML;
        if (noteData.tabs[noteData.activeTab].title !== newTitle) {
            noteData.tabs[noteData.activeTab].title = newTitle;
            state.save();
            const tabPart = sticky.querySelector(`.stickynote-tab[data-tab-index="${noteData.activeTab}"] .stickynote-tab-part[data-part="title"]`);
            if(tabPart) {
                tabPart.classList.toggle('filled', !!newTitle.trim());
                tabPart.classList.toggle('empty', !newTitle.trim());
            }
            document.dispatchEvent(new CustomEvent('handleSearch'));
        }
    });

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'stickynote-content-wrapper';
    
    const tabContainer = document.createElement('div');
    tabContainer.className = 'stickynote-tabs';
    
    const contentContainer = document.createElement('div');
    contentContainer.className = 'stickynote-content-container';
    
    const content = document.createElement("div");
    content.contentEditable = !noteData.locked;
    content.className = `stickynote-text active`;
    content.dataset.tabIndex = noteData.activeTab;
    content.setAttribute("placeholder", "Escribe algo...");
    content.innerHTML = noteData.tabs[noteData.activeTab].content || '';
    
    let debounceTimer;
    content.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const currentTab = noteData.activeTab;
        debounceTimer = setTimeout(() => {
            noteData.tabs[currentTab].content = content.innerHTML;
            state.save();
        }, 800);
    });

    content.addEventListener('blur', () => {
        const newContent = content.innerHTML;
        const currentTab = noteData.activeTab;
        if (noteData.tabs[currentTab].content !== newContent) {
            noteData.tabs[currentTab].content = newContent;
            state.save();
            const tabPart = sticky.querySelector(`.stickynote-tab[data-tab-index="${currentTab}"] .stickynote-tab-part[data-part="content"]`);
            if(tabPart) {
                tabPart.classList.toggle('filled', !!newContent.trim());
                tabPart.classList.toggle('empty', !newContent.trim());
            }
            document.dispatchEvent(new CustomEvent('handleSearch'));
        }
    });

    contentContainer.appendChild(content);

    for (let i = 0; i < 5; i++) {
        const tab = document.createElement('div');
        tab.className = `stickynote-tab ${i === noteData.activeTab ? 'active' : ''}`;
        tab.dataset.tabIndex = i;
        tab.innerHTML = `<span class="stickynote-tab-part ${noteData.tabs[i]?.title?.trim() ? 'filled' : 'empty'}" data-part="title">Título</span><span class="stickynote-tab-part ${noteData.tabs[i]?.content?.trim() ? 'filled' : 'empty'}" data-part="content">Cuerpo</span>`;
        
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            if (noteData.activeTab === i) return;

            content.blur();
            noteData.activeTab = i;
            state.save();
            
            sticky.querySelector('.stickynote-tab.active')?.classList.remove('active');
            tab.classList.add('active');
            
            content.dataset.tabIndex = i;
            content.innerHTML = noteData.tabs[i].content || '';
            title.innerHTML = noteData.tabs[i].title || '';
        });
        
        tab.addEventListener('contextmenu', (e) => {
            e.preventDefault(); e.stopPropagation();
            // Disparamos evento para mostrar el menú contextual
            document.dispatchEvent(new CustomEvent('showTabContextMenu', { 
                detail: { x: e.clientX, y: e.clientY, noteId: noteData.id, tabIndex: i } 
            }));
        });
        tabContainer.appendChild(tab);
    }
    
    const connectionBtnsContainer = document.createElement("div");
    connectionBtnsContainer.className = 'connection-buttons-container';

    const connectBtn = document.createElement("div");
    connectBtn.className = 'connect-btn';
    connectBtn.innerHTML = '☍';
    connectBtn.title = 'Crear conexión';
    connectBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        document.dispatchEvent(new CustomEvent('handleConnectionClick', { detail: { noteId: noteData.id } }));
    });
    connectionBtnsContainer.appendChild(connectBtn);

    const resizer = document.createElement("div");
    resizer.className = "resizer";
    
    sticky.appendChild(title);
    contentWrapper.appendChild(contentContainer);
    contentWrapper.appendChild(tabContainer);
    sticky.appendChild(contentWrapper);
    sticky.appendChild(connectionBtnsContainer);
    sticky.appendChild(resizer);
    
    container.appendChild(sticky);
    
    if (isNew) {
        sticky.classList.add('new-note-animation');
        sticky.addEventListener('animationend', () => sticky.classList.remove('new-note-animation'), { once: true });
    }
    return sticky;
}

export function bringToFront(noteElement, noteData) {
    if (noteData.zIndex >= state.maxZIndex) return;
    noteData.zIndex = state.getNewZIndex();
    noteElement.style.zIndex = noteData.zIndex;
    state.save();
}
